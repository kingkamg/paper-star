import Helpers from 'Helpers'
import { FoeType, BulletType } from 'Types'
import CameraControl from 'CameraControl'

cc.Class({
    extends: cc.Component,

    properties: {
        fxTrail: cc.ParticleSystem,
        camera: CameraControl,
        bulletType: {
            default: BulletType.Line,
            type: BulletType
        },
        hp: 100,
        curHp: 100,
        score: 0,
        cost_ms: 0,
        bulletCollisionTime: {
            default: 2,
            displayName: '子弹可碰撞次数'
        },
        life: {
            default: 3,
            displayName: '生命数'
        },
        curExp: {
            default: 0,
            displayName: '当前经验值'
        },
        curLv: {
            default: 0,
            displayName: '当前等级'
        },
        RoleColor: {
            default: cc.Color.BLACK,
            displayName: '玩家颜色'
        },
        isStop: true,
        moveDir: {
            default: cc.v2(0, 1),
            displayName: '移动方向'
        },

        moveAngle: {
            default: 90,
            displayName: '移动角度'
        },

        speedUpFlag: {
            default: false,
            displayName: '开启加速'
        },
        moveSpeed: {
            default: 0,
            displayName: '移动速度'
        },

        normalSpeed: {
            default: 100,
            displayName: '正常初始速度'
        },

        accelSpeed: {
            default: 10,
            displayName: '加速度'
        },

        maxSpeed: {
            default: 300,
            displayName: '最大速度'
        },

        _delayFlag: false,
        _shootFlag: false
    },

    // use this for initialization
    // onLoad () {},

    init (game) {
        this.game = game
        this.curHp = this.hp
        this.score = 0
        this.initPlayer()
        this.onControl()
        // 随机位置
        // this.node.setPosition(cc.v2( (Math.random() - 0.5) * 2  * this.game.map.width / 2, (Math.random() - 0.5) * 2  * this.game.map.height / 2))
        this.node.setPosition( cc.v2(0, 0) )
        this.oneShootKills = 0
    },

    ready () {
        this.inputEnabled = true
        this.isAlive = true
    },

    //初始化 plane
    initPlayer () {
        // 修改颜色
        let color = cc.Color.BLACK
        this.RoleColor = color.fromHEX(Helpers.getRandomColor())
        this.node.color = this.RoleColor
        this.jet = this.node.getChildByName('jet')
        this.jet.getChildByName('triangle').color = this.RoleColor

        this.emitter = this.node.getChildByName('emitter')
    },

    // 控制
    onControl () {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    },

    onKeyDown (event) {
        switch (event.keyCode) {
            // shoot
            case cc.KEY.space:
                this._shootFlag = true
                break
            case cc.KEY.up:
            case cc.KEY.w:
                this.moveUp()
                break
            case cc.KEY.left:
            case cc.KEY.a:
                this.moveLeft()
                break
            case cc.KEY.right:
            case cc.KEY.d:
                this.moveRight()
                break
            default:
                break
        }
    },

    onKeyUp (event) {
        switch (event.keyCode) {
            // release shoot
            case cc.KEY.space:
                this._shootFlag = false
                break
            case cc.KEY.up:
            case cc.KEY.w:
                this.stopMove()
                break
            case cc.KEY.left:
            case cc.KEY.a:
                this.moveLeftFlag = false
                break
            case cc.KEY.right:
            case cc.KEY.d:
                this.moveRightFlag = false
                break
            default:
                break
        }
    },

    moveUp () {
        this.speedUpFlag = true
        this.startMove()
    },

    moveLeft () {
        this.moveLeftFlag = true
    },

    moveRight () {
        this.moveRightFlag = true
    },

    startMove () {
        this.isStop = false
        this.getComponent(cc.RigidBody).linearDamping = 0
        this.node.getChildByName('jet').opacity = 255
        this.fxTrail.resetSystem()
    },

    stopMove () {
        this.isStop = true
        this.speedUpFlag = false
        this.getComponent(cc.RigidBody).linearDamping = 0.5
        this.node.getChildByName('jet').opacity = 0
        this.fxTrail.stopSystem()
    },

    shoot () {
        let radian = cc.degreesToRadians(90 - this.node.rotation)
        let dir = cc.pForAngle(radian)
        this._delayFlag = true
        this.game.waveMng.spawnBullet(this.bulletType, dir, this)
    },

    roleRotate () {
        if (this.moveLeftFlag) {
            this.moveAngle += 2
        }
        if (this.moveRightFlag) {
            this.moveAngle -= 2
        }
        let degree = 90 - this.moveAngle
        this.node.rotation = degree
    },

    speedUp () {
        if (this.accelSpeed > 0 && this.moveSpeed < this.maxSpeed) {
            this.moveSpeed += this.accelSpeed
        }
    },

    //获取杀死一个 NPC 得到的经验
    getExp (enemyLv) {
        if (enemyLv == 0) {
            return 50;
        }
        return 100 * 2^(enemyLv - 1)
    },

    //下一等级的计算公式，如果是true就要升级
    cal () {
        let nextExp = 100 * 2^this.curLv
        console.log('经验：', nextExp, this.curExp);

        if (this.curExp >= nextExp) {
            this.curExp = this.curExp - nextExp
            return true
        }
        
    },

    // 碰撞回调
    onBeginContact (contact, selfCollider, otherCollider) {
        this.curHp -= Helpers.inflictDamage(otherCollider)
        this.game.inGameUI.showHp()

        if (this.curHp <= 0 && this.isAlive) {
            this.isAlive = false
            this.dead()
        }

        // if (otherCollider.density >= 100) {
        //     this.camera.shakeCamera();
        // }
    },

    onEndContact: function (contact, selfCollider, otherCollider) {
        // cc.log(otherCollider)
    },

    dead () {
        this.isAlive = false
        this.life--
        this.game.playerFX.playDead()
        this.game.inGameUI.showLife()
        let self = this
        if (this.life > 0) {
            this.scheduleOnce(function(){
                self.game.death()
            }, this.game.playerFX.deadAnim.currentClip.duration)
        } else {
            this.game.gameOver()
        }
    },

    revive () {
        this.isAlive = true
        this.curHp = this.hp
    },    

    update () {
        if (this.speedUpFlag) {
            this.speedUp()
        }
        
        if (this._shootFlag && !this._delayFlag) {
            this.shoot()
        }
        this.moveDir = cc.pForAngle(cc.degreesToRadians(this.moveAngle))
        this.roleRotate()
        if (!this.isStop) {
            this.getComponent(cc.RigidBody).linearVelocity = cc.v2(this.moveSpeed * this.moveDir.x, this.moveSpeed * this.moveDir.y)
        }
        // cc.log(this.moveSpeed)
        // cc.log(this.node.getPosition())
    },

    addKills () {
        this.oneShootKills++
        this.game.inGameUI.addCombo()
    },

    addScore (score) {
        this.score += score
        this.game.inGameUI.showScore(this.score)
    },

    onAtkFinished () {
        if (this.oneShootKills >= 3) {
            this.game.inGameUI.showKills(this.oneShootKills)
        }
    },

    // net
    storeUserGameData () {
        let KVData = {
            "nickName": Global.userInfo ? Global.userInfo.nickName.string : '匿名',
            "wxgame": {
                "score": this.score,
                "update_time": Date.parse(new Date())
            },
            "cost_ms": this.cost_ms
        }

        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            let KVDataList = []
            KVDataList.push(JSON.stringify(KVData))
            wx.setUserCloudStorage({
                KVDataList
            })
        }
        //  else {
            let records = cc.sys.localStorage.getItem('records')
            if (records) {
                records = JSON.parse(records)
                if (!(records instanceof Array)) {
                    records = []
                } else if (records.length >= 20) {
                    console.log(records.pop())
                }
                records.unshift(KVData)
            }
            cc.sys.localStorage.setItem('curRecord', JSON.stringify(KVData))
            cc.sys.localStorage.setItem('records', JSON.stringify(records))
        // }

        Global.rank.fresh()
    },
})
