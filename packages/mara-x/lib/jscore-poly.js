const location = { href: './', search: '.' }
const navigator = { mimeTypes: [], userAgent: 'fdjskl' }

class SessionStorage {
  setItem() {}
}

class Element {
  constructor() {
    this.style = {}
  }
  createElement() {
    return this._fakeDomElement
  }
  appendChild() {}
  attachEvent() {}
  addEventListener() {}
  querySelectorAll() {
    return []
  }
}

class SinaCallEvent {
  trigger() {}
  on() {}
}

class Window extends Element {
  constructor(document) {
    super()
    this.navigator = navigator
    this.document = document
    this.location = location
  }
}

class Document extends Element {
  constructor() {
    super()
    this._fakeDomElement = new Element()
    this.body = this._fakeDomElement
    this.documentElement = this._fakeDomElement
    this.cookie = ''
    this.location = location
    this.sessionStorage = new SessionStorage()
  }
}

function injectEnvironment() {
  global.document = new Document()
  global.window = new Window(global.document)
  global.sessionStorage = new SessionStorage()
  global.navigator = navigator
  global._sinaCallEvent = new SinaCallEvent()

  global.$ = function() {}
  $.extend = function() {}
}

injectEnvironment()
