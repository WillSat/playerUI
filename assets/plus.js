'use strict'

// 判断终端
var isAndroid = navigator.userAgent.toString().includes('Android') || navigator.userAgent.toString().includes('Adr')
var isiOS = !!navigator.userAgent.toString().match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)

// 依赖anime.js
function Anime(el, effect) {
  anime(Object.assign({
    targets: el,
    easing: 'linear',
    duration: 200
  }, effect))
}

// 百分号编码
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16)
  })
}

// 日期格式化
Date.prototype.format = function (fmt) {
  const o = {
    'M+': this.getMonth() + 1, // 月份
    'd+': this.getDate(), // 日
    'w': '周' + '日一二三四五六'[this.getDay()], // 周
    'h+': this.getHours(), // 小时
    'm+': this.getMinutes(), // 分
    's+': this.getSeconds(), // 秒
    'q+': Math.floor((this.getMonth() + 3) / 3), // 季度
    'S': this.getMilliseconds() // 毫秒
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
  }
  for (let k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
    }
  }
  return fmt
}

// 测试是否为 JSON
function isJSON(s) {
  if (typeof s === 'string') {
    try {
      var o = JSON.parse(s)
      return typeof(o) === 'object' && o
    } catch(e) {
      return false
    }
  }
}

// 四舍五入保留
function mathRound(number, precision) {
  return Math.round(+number + 'e' + precision) / Math.pow(10, precision)
}

/* 防抖，在一定时间内，多次点击只有一次有效。*/
function debounce(fn, delay = 500){
  let t = null
  return function(){
    let c = this, a = arguments
    if (t) return
    t = setTimeout(() => {
      fn.apply(c, a)
      t = null
    }, delay)
  }
}
/* 节流，只要是事件不停止就不会执行。*/
function throttle(fn, delay = 500){
  let t = null
  return function(){
    let c = this, a = arguments
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      fn.apply(c, a)
    }, delay)
  }
}

// js 下载文件
async function downloadFile(url, filename = '', fn) {
  let response = await fetch(url)
  let blob = await response.blob()
  const a = document.createElement('a')
  a.download = filename
  a.href = window.URL.createObjectURL(blob)
  a.click()
  a.remove()
  if (fn) fn()
}