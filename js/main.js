// MIT License
// Copyright (c) 2021 Will

'use strict'

import {
  NAMES
} from './const.js'

const chatBox = Vue.createApp({
  data() {
    return {
      // 与 fetch 结果相似
      info: {
        hitokoto: ' Nefelibata ',
        from: 'A cloud walker'
      },

      time: null, // 时间戳
      nowTime: '',
      // 倒计时
      countDown: '',

      user_UUID: '',
      user_POS: '',

      NAMES: Object.freeze(NAMES),

      uuid_ver: 2,

      if_correctUUID: false,

      isLoading: false,

      isSleeping: false,

      // v-model 绑定 #tosay
      inputing: '',
      nameChecked: true,

      // 消息
      loaded: false,
      msgGroup: localStorage.getItem('msgGroup') ? JSON.parse(localStorage.getItem('msgGroup')) : '',

      isChooseFile: false
    }
  },

  computed: {
    pickedName() {
      let T = this
      return NAMES.filter(n => T.inputing.includes(n)).join(' ')
    }
  },

  watch: {
    if_uploadFile() {
      let T = this
      if (T.dragover_timer) clearTimeout(T.dragover_timer)
      T.dragover_timer = setTimeout(() => {
        if (!T.isUploadingFile) T.if_uploadFile = false
        T.dragover_timer = null
      }, 3000)
    },

    msgGroup: {
      deep: true,
      handler: function (msgGroup) {
        localStorage.setItem('msgGroup', JSON.stringify(msgGroup))
      }
    }
  },



  created() {
    let T = this

    T.getInfo()
    T.longPolling()
    T.getHitokoto()

    T.nowTime = new Date().format('w hh:mm:ss')

    setInterval(() => {
      T.time = Date.now()
      T.nowTime = new Date().format('w hh:mm:ss')

      // 计算倒计时
      let cd = 1654531200 - Math.floor(Date.now() / 1000)
      T.countDown = `${Math.floor(cd / 60 / 60 / 24)}天 ${Math.floor(cd / 60 / 60) % 24}小时 ${Math.floor(cd / 60) % 60}分钟 ${cd % 60}秒`
    }, 1000)
    setInterval(() => T.getHitokoto(), 1000 * 60 * 20)
  },



  methods: {
    // 检索数组并渲染DOM
    renderDOM(result) {
      let logs = this.msgGroup, T = this
      setTimeout(() => T.longPolling(), 1500)

      if (!logs || logs.length > result.length) this.msgGroup = result
      else {
        let i = result.length
        while (i--) {
          if (JSON.stringify(result[i]) !== JSON.stringify(logs[i]))
            this.msgGroup[i] = result[i]
        }
      }
      if (result[result.length - 1].uuid != this.user_UUID
        && !result[result.length - 1].read
        && this.loaded) this.pushNotification()
      else this.loaded = true

      this.isSleeping = false
      this.scrollTObottom()
    },

    // 从 localStorage 中获取user UUID & POS
    getInfo() {
      if ((localStorage.getItem('uuid_ver') || 0) != this.uuid_ver) this.if_correctUUID = true
      else this.user_UUID = localStorage.getItem('uuid')

      if (!localStorage.getItem('position')) localStorage.setItem('position', 'normal')
      this.user_POS = localStorage.getItem('position')
    },

    // 发送消息
    async sendMsg() {
      let T = this
      T.isLoading = true

      let last = (info) => {
        if (info) alert(info)
        T.isLoading = false
      }

      if (!T.inputing) {
        last('内容不得小于1字')
        return
      }
      
      // 本地命令运行
      if (T.runCommend(T.inputing)) {
        T.inputing = ''
        last()
        return
      }

      if (!T.user_UUID) {
        last('请先完善信息')
        return
      }

      let NAME, DATE, CODE
      if (T.inputing.includes('/ADMIN') && T.user_POS.toLowerCase() === 'admin') {
        NAME = ''
        DATE = 'Admin'
        CODE = fixedEncodeURIComponent(T.inputing.replace('/ADMIN', ''))
      } else {
        NAME = T.nameChecked ? T.pickedName : ''
        DATE = Date.now()
        CODE = fixedEncodeURIComponent(T.inputing)
      }

      // fetch (async & await)
      let response = await fetch('./php/add.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ uuid: T.user_UUID, pos: T.user_POS, code: CODE, date: DATE, name: NAME })
      })
      let result = await response.json()
      // result === [状态, 是否是php命令]
      if (result[0] === 'success') {
        last()
        T.inputing = ''
      } else if (result[0] === 'error') {
        last(result[1])
      }
    },

    // 更新消息
    async updateMsg(index, text, oldCode) {
      let update_id = this.msgGroup[index].id
      let CODE = oldCode ? oldCode + fixedEncodeURIComponent(text) : fixedEncodeURIComponent(text)

      // fetch (async & await)
      let response = await fetch('./php/update.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ id: update_id, code: CODE })
      })
      let result = await response.json()
      if (result[0] === 'success') this.msgGroup[index].code = CODE
    },

    // 删除消息
    async deleteMsg(index) {
      let delete_id = this.msgGroup[index].id

      // fetch (async & await)
      let response = await fetch('./php/delete.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ id: delete_id })
      })
      let result = await response.json()
      if (result[0] === 'success') alert(result[1])
    },

    // 长轮询
    async longPolling() {
      let T = this, logs = document.querySelector('#logs')
      let NUM = logs ? logs.children.length : 0

      // fetch (async & await)
      let response = await fetch('./php/longpolling.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ uuid: T.user_UUID, num: NUM })
      })
      let result = await response.json()
      if (result[0] !== 'success' && result[0] !== 'error') T.renderDOM(result)
      else T.longPolling()
    },

    // 滚动到底部
    scrollTObottom() {
      let logs = document.querySelector('#logs')
      setTimeout(() => {
        this.isLoading = false
        Anime('#logs', {
          scrollTop: logs.scrollHeight,
          duration: 1000,
          easing: 'cubicBezier(0, 0, .58, 1)'
        })
      })
    },

    // 检查并运行命令
    runCommend(text) {
      let arr = text.split(' '), T = this
      if (arr[0] !== '/C' || arr.length < 3) return
      let [, , index, ...susplus] = arr

      let O = {
        'DELETE': () => T.deleteMsg(Number(arr[2])),
        'DECODE': () => console.info(decodeURIComponent(T.msgGroup[arr[2]].code)),
        'UPDATE': () => T.updateMsg(Number(index), susplus.join(' ')),
        'UPDATE+': () => T.updateMsg(index, susplus.join(' '), T.msgGroup[index].code),
        'GET': () => {
          localStorage.setItem('position', arr[2].toLowerCase())
          T.getInfo()
        }
      }

      for (let k in O) {
        if (arr[1] === k) {
          if (T.user_POS === 'admin' || k === 'GET') O[k]()
          else alert('您无此权限!')
          return true
        }
      }
    },



    // 消息推送
    pushNotification() {
      if (!('Notification' in window)) return
      else if (Notification.permission === 'granted') {
        let aim_Index = this.msgGroup.length - 1
        let noti_Cont = decodeURIComponent(this.msgGroup[aim_Index].name ? this.msgGroup[aim_Index].name : this.msgGroup[aim_Index].code)
        let n = new Notification('聊天室', { body: noti_Cont })
      }
      else if (Notification.permission !== 'denied') Notification.requestPermission()
    },



    // 已读或未读
    async turnMsgState(index) {
      if (this.user_UUID !== '老师') {
        alert('您无此权限!')
        return
      }
      this.isLoading = true
      let id, state, T = this

      if (index !== undefined) {
        id = T.msgGroup[index]['id']
        state = !T.msgGroup[index]['read']
      } else {
        // 全部已读
        id = 'all'
        state = false

        T.msgGroup.forEach((ele, i) => T.msgGroup[i].read = true)
      }

      let response = await fetch('./php/changestatus.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ id: id, to: state })
      })
      let result = await response.json()
      if (result[0] === 'success') {
        if (index !== undefined) this.msgGroup[index]['read'] = state
        this.isLoading = false
      } else if (result[0] === 'error') alert(`error: ${result[1]}`)
    },



    // 上传文件
    async fileDrop(method, event) {
      let T = this

      // fils 并非 Array，而是 FileLst，使用 for...of...
      let files = method === 'choose' ? event : event.dataTransfer.files
      let DATE = Date.now(), formData = new FormData()
      formData.append('date', DATE)
      formData.append('uuid', this.user_UUID)
      formData.append('pos', this.user_POS)

      for (let file of files) {
        if (!file) {
          alert('无文件')
          return
        }
        if (file.size > 15000000) {
          alert('文件应小于 15MB')
          return
        }
        formData.append('files[]', file)
      }

      // fetch (async & await)
      let response = await fetch('./php/uploadfile.php', { method: 'POST', body: formData })
      let result = await response.json()
      if (result[0] === 'error') {
        alert(`error: ${result}`)
      }
    },



    // 获取一言
    async getHitokoto() {
      let response = await fetch('https://v1.hitokoto.cn/?c=i&c=d&c=k&encode=json')
      this.info = await response.json()
    },

    // 判断是否为自身消息
    isSelfMsg(uuid) {
      if (uuid == this.user_UUID) return [true, 'msg msg_self', 'msgdate_self', 'msgtext_self', 'msgname_self', 'imgs_self']
      else return [false, 'msg', 'msgdate', 'msgtext', 'msgname', 'imgs']
    },

    // 是否显示消息日期
    showDate(index) {
      if (index === 0) return true
      let presentDate = this.msgGroup[index]['date'],
        lastDate = this.msgGroup[index - 1]['date']
      
      if (this.msgGroup[index]['uuid'] !== this.msgGroup[index - 1]['uuid']) return true
      if (isNaN(presentDate) || isNaN(lastDate)) return true
      if (presentDate.length !== 13 || lastDate.length !== 13) return true
      return (Number(presentDate) - Number(lastDate)) > 1000 * 60 * 10
    },

    waterWave(event) {
      let wave = document.createElement('div'), el = event.currentTarget
      wave.className = 'wave'
      wave.style.left = event.pageX - el.getBoundingClientRect().left + 'px'
      wave.style.top = event.pageY - el.getBoundingClientRect().top + 'px'
      el.append(wave)
      setTimeout(() => wave.remove(), 2000)
    },

    correctUUID(uuid) {
      if (uuid) {
        this.user_UUID = uuid
        localStorage.setItem('uuid', uuid)
        localStorage.setItem('uuid_ver', this.uuid_ver)
      }
    }
  }
})



chatBox.component('com-msg', {
  props: ['name', 'code', 'date', 'read', 'uuid', 'index', 'msgwho', 'showdate', 'time'],
  emits: ['turnMsgState', 'waterWave'],
  data() {
    return {
      if_show_text: !this.name,
      if_show_img: [],
      if_show_pastTime: false,

      if_file_detail: false,
      file_detail: 0,

      nowTime: null
    }
  },
  computed: {
    decodeMsg() {
      return decodeURIComponent(this.code)
    },
    isSystemMsg() {
      return this.decodeMsg === '/SYSTEMMSG'
    },
    shouldFormatDate() {
      return Number(this.date) && this.date.length === 13
    },
    preciseDate() {
      return this.shouldFormatDate ? new Date(Number(this.date)).format('MM-dd w hh:mm') : this.date
    },
    readSignColor() {
      return this.read ? '#2ca' : '#9f9e9c'
    },
    pastTime() {
      if (this.shouldFormatDate) {
        let pastMinute = Math.floor((this.time - this.date) / 1000 / 60)
        let d = Math.floor(pastMinute / 60 / 24),
          h = Math.floor(pastMinute / 60) % 24,
          m = pastMinute % 60
        return `约${d ? d + '天' : ''}${h ? h + '小时' : ''}${!d ? m + '分钟' : ''}前`
      } else return ''
    },
    files() {
      if (this.decodeMsg.startsWith('|FILE|') && isJSON(this.decodeMsg.slice(6))) {
        let fileArr = JSON.parse(this.decodeMsg.slice(6))
        let parsedFileArr = []
        let knownTypes = ['pdf', 'docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls', 'zip', 'mp3']
        let imgTypes = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico']

        fileArr.forEach(file => {
          let type = file.type.toLowerCase()
          let size = file.filesize < 1024 ? `${file.filesize}B`
            : file.filesize < 1024*1024 ? `${mathRound(file.filesize / 1024, 2)}KB` 
            : `${mathRound(file.filesize / 1024 / 1024, 2)}MB`            
          parsedFileArr.push({
            url: file.url,
            name: file.name,
            type,
            size, // 文件大小
            iconUrl: `https://cdn.jsdelivr.net/gh/WillSat/ctrm/assets/fileico/${knownTypes.includes(type) ? type : 'default'}.webp`,
            isPic: imgTypes.includes(type), // 是否是照片
            simplifiedImgUrl: file.simplifiedimgurl ? file.simplifiedimgurl : file.url, // 缩略图链接 / 原图链接（图片较小）
            imgSize: file.imgsize // 图片的尺寸
          })
        })
        return parsedFileArr
      }
    }
  },
  methods: {},
  template: `
    <div :class='msgwho[1]' 
      @click.stop='name ? if_show_text = !if_show_text : null; $emit("waterWave", $event)'>

      <!-- 时间 -->
      <div v-if='!isSystemMsg && showdate' :class='msgwho[2]'>
        <span v-if='msgwho[0]' class='msgUUID'>{{ uuid + ' [' + index + ']'}}</span>
        <span v-if='msgwho[0]' class='pasttime'>{{ ' ' + pastTime }} </span>
        {{ preciseDate }}
        <span v-if='!msgwho[0]' class='pasttime'> {{ pastTime + ' ' }}</span>
        <span v-if='!msgwho[0]' class='msgUUID'>{{ '[' + index + '] ' + uuid }}</span>
      </div>

      <!-- /SYSTEMMSG -->
      <div v-if='isSystemMsg' class='systemmsg'>
        <hr><span>{{ preciseDate }}</span><hr>
      </div>

      <!-- 名字 -->
      <div :class='[ msgwho[4], { textappear: if_show_text } ]' 
        v-if='!isSystemMsg && !files && name'>{{ name }}</div>

      <!-- 内容 -->
      <transition v-if='!isSystemMsg && !files' :name='msgwho[0] ? "showtext_re" : "showtext"'>
        <div 
          :class='msgwho[3]' v-show='if_show_text' 
          v-html='decodeMsg' :title='uuid'></div>
      </transition>

      <div class='file-img-wrapper' v-if='!isSystemMsg && files'>
        <!-- 图片 -->
        <template v-for='(file, i) in files' :key='file.name'>
          <transition name='longfade' v-if='file.isPic'>
            <img
              v-show='if_show_img[i]' :src='file.simplifiedImgUrl ? file.simplifiedImgUrl : file.src' :class='msgwho[5]' 
              @click='file_detail = i; if_file_detail = true' @load='if_show_img[i] = true'>
          </transition>
          <!-- 文件 -->
          <div class='filewrapper' v-if='!file.isPic'
            @click='file_detail = i; if_file_detail = true'>
            <img :src='file.iconUrl' class='fileicon'>
            <p class='filename' v-text='file.name'></p>
          </div>
        </template>
      </div>

      <!-- 已读/未读 -->
      <div class='read' v-if='!isSystemMsg' 
        @click.stop='$emit("turnMsgState")' 
        :title='read ? "此消息已读" : "此消息未读"'>
        <svg :class='read ? "read-true-svg" : "read-false-svg"' viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M933.568 211.008c-27.072-28.096-71.232-28.096-98.304 0.128l-474.816 492.096L213.12 550.656c-27.2-28.16-71.232-28.16-98.432-0.064-27.008 28.096-27.008 73.664 0 101.952l196.864 203.904c27.008 28.096 71.104 28.096 98.304 0.128 0.512-0.576 0.704-1.344 1.216-1.92l522.56-541.632C960.64 284.8 960.64 239.232 933.568 211.008z" :fill="readSignColor"></path></svg>
        {{ read ? "已读" : "未读" }}
      </div>

      <!-- fileDetail -->
      <teleport to='body' v-if='!isSystemMsg && files'>
        <com-file-detail 
          :is-show='if_file_detail' :file='files[file_detail]' :uuid='uuid' 
          :date='shouldFormatDate ? preciseDate : ""' 
          :past-time='pastTime' 
          @close-self='if_file_detail = false'></com-file-detail>
      </teleport>

    </div>
  `
})


chatBox.component('com-file-detail', {
  props: ['isShow', 'file', 'uuid', 'date', 'pastTime'],
  emits: ['closeSelf'],
  computed: {
    isOffice() {
      return ['docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls'].includes(this.file.type)
    },
    isPdf() {
      return this.file.type === 'pdf'
    }
  },
  methods: {
    download() {
      let T = this
      downloadFile(this.file.url, this.file.name, () => {
        T.$emit('closeSelf')
      })
    },
    preview() {
      if (this.isOffice) window.open('https://view.officeapps.live.com/op/view.aspx?src=https://ctrm.xyz/' + this.file.url.slice(3))
    }
  },
  template: `
    <transition name='fade'>
      <div class='filedetail_pos cover' v-if='isShow'>
        <div class='shadow' @click='$emit("closeSelf")'></div>
        <div class='white-wrapper'>
          <div class='fd_title_wrapper'>
            <img v-if="!file.isPic && file.type !== 'mp3'" :src='file.iconUrl' class='fd_ico'>
            <p class='fd_caption'>{{ file.name }}</p>
          </div>
          <hr>
          <div v-if="file.isPic" class="fd_view_img_wrapper">
            <img class='fd_view_img' :src='file.url'>
            <span class='fd_img_size'>{{ file.imgSize }}</span>
          </div>
          
          <audio :src="file.url" class="fd_music" v-if="file.type === 'mp3'" controls="controls" loop="true">Please download!</audio>

          <div class='fd_detail_wrapper'>
            <p class='fd_text'><b>文件类型: </b>{{ file.type }}</p>
            <p class='fd_text'><b>文件大小: </b>{{ file.size }}</p>
            <p class='fd_text'><b>上传成员: </b>{{ uuid }}</p>
            <p class='fd_text'><b>发送日期: </b>{{ date + ' (' + pastTime + ')' }}</p>
          </div>

          <div class='button_wrapper'>
            <button :class="{ 'theme-button-disabled': !isOffice}" class='theme-button theme-button-left' @click='preview' title='Mircosoft Office Viewer'>PREVIEW</button>
            <button class='theme-button' @click='download'>下载</button>
          </div>
        </div>
      </div>
    </transition>
  `
})


chatBox.component('com-sleep', {
  props: ['nowTime', 'countDown', 'info', 'isSleeping'],
  emits: ['waterWave', 'getHitokoto', 'closeSelf'],
  data() {
    return {}
  },
  computed: {
    hitokoto() {
      return `「${this.info.hitokoto}」`
    },
    from() {
      return `—— ${this.info.from ? this.info.from + ' ' : ''}${this.info.from_who ? this.info.from_who : ''}`
    }
  },
  template: `
    <teleport to='body'>
      <transition name='fade'>
        <div id='sleep_pos' class='cover' v-if='isSleeping'>
          <div class='shadow'></div>
          <div id='s-time'>
            <span v-text='nowTime'></span>
            <div id='s-countdown'>{{ countDown }}</div>
          </div>

          <div id='s-hitokoto' @click.stop='$emit("waterWave", $event)' @dblclick.stop='$emit("getHitokoto")'>
            <p id='s-text'>{{ hitokoto }}</p>
            <p id='s-from'>{{ from }}</p>
          </div>

          <svg id='s-exit' @click.stop='$emit("closeSelf")' height=30 width=30 viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M822.6304 301.83424L612.5056 512l204.0832 204.12416-100.5568 100.57728-204.1856-204.12416-210.1248 210.176-100.5568-100.57728L411.2896 512l-210.1248-210.16576 100.5568-100.57728 210.1248 210.16576 210.2272-210.16576z"></path></svg>
        </div>
      </transition>
    </teleport>
  `
})


chatBox.component('com-unread-tips', {
  props: ['msgGroup'],
  emits: ['allReaded'],
  data() {
    return {}
  },
  computed: {
    getUnreadTips() {
      let arr = this.msgGroup.filter(obj => !obj['read'])
      return arr.length
    }
  },
  template: `
    <teleport to='body'>
      <transition name='fade'>
        <div id='unreadtips' v-if='getUnreadTips !== 0' @click.stop='$emit("allReaded")' title='点击全部已读'>
          {{ getUnreadTips + '条未读消息' }}
        </div>
      </transition>
    </teleport>
  `
})


chatBox.component('com-info-propet', {
  props: ['names', 'isShow'],
  emits: ['correctuuid'],
  data() {
    return {
      show: this.isShow,
      uuid: '',
      name: '',
    }
  },
  methods: {
    submit() {
      if (!this.name && this.uuid !== '老师') {
        alert('姓名不能为空')
        return
      }
      if (!this.names.includes(this.name) && this.uuid !== '老师') {
        alert('姓名有误')
        return
      }
      this.$emit('correctuuid', this.uuid === '老师' ? '老师' : this.name + '家长')
      this.show = false
    }
  },
  template: `
    <teleport to='body'>
      <transition name='fade'>
        <div id='p-container' v-if='show'>
          <p id='p-caption'>请填写您的信息</p>
          <fieldset>
            <legend>身份信息</legend>
            <span class='p-span'><input type='radio' v-model='uuid' value='家长' name='character' checked>家长</span>
            <span class='p-span'><input type='radio' v-model='uuid' value='老师' name='character'>老师</span>
          </fieldset>
          <fieldset v-if='uuid !== "老师"'>
            <legend>学生姓名</legend>
            <input id='p-name' v-model='name' type='text' placeholder='例如: 张三' maxlength='3'> 
          </fieldset>
          <button class='p-button' id='p-confirm' @click='submit'>确认</button>
        </div>
      </transition>
    </teleport>
  `
})


chatBox.component('com-choose-file', {
  props: ['isShow'],
  emit: ['upload', 'closeSelf'],
  data() {
    return {
      file: null,
      isUploading: false
    }
  },
  methods: {
    tirggerFile(event) {
      this.file = event.target.files
    },
    uploadFile() { 
      if (this.file) {
        this.isUploading = true
        this.$emit("upload", this.file)
        this.$emit("closeSelf")
      }
    }
  },
  template: `
    <transition name='fade'>
      <div id='choosefile_pos' class='cover' v-if='isShow'>
        <div class="shadow" @click="$emit('closeSelf')"></div>
        <div class="white-wrapper">
          <input type="file" @change="tirggerFile($event)" multiple>
          <p>{{ isUploading ? '上传中…' : '选择文件' }}</p>
          <div class='button_wrapper'>
            <button class='theme-button' @click='uploadFile'>开始上传</button>
          </div>
        </div>
      </div>
    </transition>
  `
})


let APP = chatBox.mount('#app')