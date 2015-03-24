/** @jsx React.DOM */

var React = require('react')
var Detect = require('ainojs-detect')
var Dimensions = require('ainojs-dimensions')

var blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre']

var linkinputValue = ''

var extend = function(o1, o2) {
  for( var i in o2)
    o1[i] = o2[i]
  return o1
}

var toHTML = function(text) {

  var div = document.createElement('div')
  div.innerHTML = text.replace(/\t/g,'    ').replace(/[^\S\n]{2}/g,'&nbsp; ');

  var parsed = div.innerText || div.textContent
  var arr = parsed.split(/[\r\n]/g)

  return arr.join('<br>')
    .replace('<br><br>','</p><p>')
    .replace('<br></p>','</p>')
    .replace('<p><br>','<p>')
}

var getBlockElement = function(el) {
  var tagName

  if (el && el.tagName)
    tagName = el.tagName.toLowerCase()

  while (el && blockTags.indexOf(tagName) === -1) {
    el = el.parentNode
    if (el && el.tagName)
      tagName = el.tagName.toLowerCase()
  }

  return el
}

var getSelectionStart = function() {
  var node = document.getSelection().anchorNode
  return node && node.nodeType === 3 ? node.parentNode : node
}

var setCaretAt = function(node) {
  var range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  var sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

var selectionInEditor = function() {
  var node = getSelectionStart()
  if ( !node )
    return false
  while( node.tagName && !node.getAttribute('data-editor') )
    node = node.parentNode
  return node !== document
}

var insertNode = function(node, replace) {
  var selection = document.getSelection()
  if ( replace ) {
    var currentNode = getSelectionStart()
    currentNode.parentNode.removeChild(currentNode)
  }
  var range = selection.getRangeAt(0)
  range.insertNode(node)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
  return node
}

var saved

var saveSelection = function() {
  var i = 0
  var sel = document.getSelection()
  var len = sel.rangeCount
  var ranges
  if (sel.getRangeAt && sel.rangeCount) {
    ranges = []
    for (; i < len; i++)
      ranges.push(sel.getRangeAt(i))

    saved = ranges
  }
}

var restoreSelection = function() {
  if ( !saved )
    return
  var i = 0
  var len = saved.length
  var sel = document.getSelection()
  sel.removeAllRanges()
  for (; i < len; i++)
    sel.addRange(saved[i])
}

module.exports = React.createClass({
  getInitialState: function() {
    return {
      html: '',
      toolStyles: {display: 'none'},
      linkInputStyles: {display: 'none'},
      injectStyles: {display: 'none'},
      arrowLeft: 0,
      arrowTop: 0,
      toolbarBelow: false,
      toolbarMode: 'default',
      staticSelected: null,
      linkMode: false,
      injectMode: false
    }
  },

  selection: null,
  getElement: function() {
    return this.refs.editor.getDOMNode()
  },
  selectStatic: function(node) {
    console.log(this.state.staticSelected, node)
    if(!this.isMounted()) return;
    if ( this.state.staticSelected === node )
      return
    this.getElement().blur()
    node.classList.add('selected')
    this.setState({
      staticSelected: node
    })
  },
  checkSelection: function(e) {

    if ( e && e.type == 'mouseup' ) {
      var container = e.target.parentNode.parentNode
      if ( container && ('getAttribute' in container) && container.getAttribute('data-static') ) {
        this.selectStatic(container)
        return
      }
    }

    var newSelection
    var selectionElement

    Array.prototype.forEach.call(this.getElement().querySelectorAll('*[data-static]'), function(node) {
      node.classList.remove('selected')
    })

    if(!this.isMounted()) return;

    this.setState({ staticSelected: null })

    if( e && this.state.linkMode ) {
      if ( e.target == this.refs.linkinput.getDOMNode() )
        return
      else
        this.createLink()
    }

    if( e && this.state.injectMode ) {
      if ( e.target == this.refs.injectinput.getDOMNode() )
        return
      else
        this.resetInject()
    }

    // tick the selection check
    setTimeout(function() {
      console.log('setTimeout');
      if ( !this.state.linkMode ) {

        newSelection = document.getSelection()

        if ( !newSelection.toString().trim() || !selectionInEditor() )
          this.hideToolbar()
        else {
          this.selection = newSelection
          this.showToolbar()
        }

        if ( !newSelection.toString().trim() && selectionInEditor() ) {

          var cursor = getSelectionStart()
          var parent = cursor.parentNode
          if (parent.getAttribute('data-static')) {
            this.selectStatic(parent)
            return
          }

          if ( cursor && cursor.nodeName == 'P' && /^\s*(<br>)?\s*$/.test(cursor.innerHTML) ) {
            var pos = cursor.getBoundingClientRect()
            var rect = this.getElement().getBoundingClientRect()
            if(!this.isMounted()) return;
            this.setState({
              injectStyles: {
                display: 'block',
                top: pos.top - rect.top,
                left: pos.left - rect.left
              }
            })
          } else {
            if(!this.isMounted()) return;
            this.setState({ injectStyles: { display: 'none' } })
          }
        }
      }
    }.bind(this), 4)
  },
  createLink: function() {
    this.setState({ 
      linkMode: false,
      linkinputStyles: { display: 'none' }
    })
    restoreSelection()
    if ( linkinputValue ) {
      if (! (/^([a-zA-Z0-9+.-]+:\/\/|\/)/ ).test(linkinputValue) )
        linkinputValue = 'http://'+linkinputValue
      document.execCommand('createLink', false, linkinputValue)
    }
    else
      document.execCommand('unlink', false, null)
  },
  componentDidMount: function() {
    if(!this.isMounted()) return;
    var node = this.getElement()
    var html = this.props.html || ''
    node.innerHTML = html
    this.setState({ html: html })

    document.documentElement.addEventListener('mouseup', this.checkSelection)
  },
  componentWillUnmount: function() {
    document.documentElement.removeEventListener('mouseup', this.checkSelection)
  },
  hideToolbar: function() {
    if(!this.isMounted()) return;
    this.setState({
      toolStyles: { display: 'none' }
    })
  },
  showToolbar: function() {
    if(!this.isMounted()) return;

    var start = getBlockElement(document.getSelection().anchorNode)
    var end = getBlockElement(document.getSelection().focusNode)
    var reg = /^(H1|H2|H3|H4|H5|H6)$/

    this.setState({
      toolbarMode: (start && reg.test(start.nodeName)) || (end && reg.test(end.nodeName)) ? 'heading' : 'default' 
    })

    this.setState({ 
      injectStyles: { display: 'none' }
    })
      
    var pos = this.getToolbarPosition()
    this.setState({
      toolStyles: {
        display: 'block',
        opacity: 1,
        top: pos.top,
        left: pos.left
      },
      arrowTop: pos.arrowTop,
      arrowLeft: pos.arrowLeft
    })
  },
  getToolbarDimensions: function() {
    if(!this.isMounted()) return;
    this.setState({
      toolStyles: extend( this.state.toolStyles, { opacity: 0, display: 'block' })
    })
    var dim = Dimensions(this.refs.toolbar.getDOMNode())
    this.setState({
      toolStyles: extend( this.state.toolStyles, { opacity: 1 })
    })
    return dim
  },
  getToolbarPosition: function() {
    var dim = this.getToolbarDimensions()
    var containerRect = this.getElement().getBoundingClientRect()
    var cleft = containerRect.left-4
    var sel = document.getSelection()
    var range = sel.getRangeAt(0)
    var selection = range.getBoundingClientRect()
    var top = selection.top - containerRect.top
    var left = selection.left - cleft
    var isUnder = selection.top < dim.height + 10
    var center = (selection.left + selection.width/2) - dim.width/2
    var arrDiff = 0
    var selectionData = getBlockElement(sel.anchorNode)

    if ( center-cleft < -cleft )
      arrDiff = center

    if(!this.isMounted()) return;

    this.setState({ toolbarBelow: isUnder })

    return {
      top: isUnder ?
        top + selection.height + 10 :
        top - dim.height - 10,
      left: Math.max(-cleft, center-cleft),
      arrowTop: isUnder ? -6 : dim.height,
      arrowLeft: (dim.width/2-7) + arrDiff
    }
  },
  onKeyUp: function(e) {
    var node = getSelectionStart()

    if ( !node )
      return

    if ( node.tagName == 'PRE' )
      return false

    // fix safari’s paragraph creation
    if ( Detect.safari && node.textContent === '' && node.tagName != 'LI' )
      document.execCommand('formatBlock', false, 'p')

    // make sure linebreaks converts to new paragraph
    // TODO prevent nested tags
    if ( e.which === 13 && !e.shiftKey && node.tagName != 'LI' ) {
      document.execCommand('formatBlock', false, 'p')
      if ( node.tagName == 'A' )
        document.execCommand('unlink', false, null)
    }
    var s = this.state.staticSelected
    if ( ( e.which == 38 || e.which == 40 ) && s ) {
      if ( e.which == 38 && s.previousSibling )
        setCaretAt(s.previousSibling)
    }
    this.checkSelection()
  },
  onKeyDown: function(e) {

    // hijack tab
    if ( e.which == 9 ) {
      e.preventDefault()
      document.execCommand('insertHtml', null, ' &nbsp; &nbsp;')
    }

    // fix safari’s line breaks
    if ( Detect.safari && e.which == 13 && e.shiftKey ) {
      e.preventDefault()
      var br = insertNode(document.createElement('br'))
      var last = br.parentNode.lastChild
      if ( last.nodeType == 3 && last.textContent === '' )
        last = last.previousSibling
      if ( last === br )
        insertNode('br')
      this.onChange()
    }

  },
  onChange: function() {
    var html = this.getElement().innerHTML
    if(!this.isMounted()) return;
    if ( html != this.state.html ) {
      this.setState({ html: html })
      typeof this.props.onChange == 'function' && this.props.onChange(html)
    }
  },
  onBlur: function() {
    this.checkSelection()
    this.onChange()
  },
  onPaste: function(e) {
    e.preventDefault()
    var clipboard = e.clipboardData
    var content = clipboard.getData('text/plain') || clipboard.getData('text/html')
    document.execCommand('insertHTML', false, toHTML(content))
  },
  onToolbarClick: function(e) {
    if(!this.isMounted()) return;

    var target = e.target.nodeName == 'BUTTON' ? e.target : e.target.parentNode
    var action = target.getAttribute('data-action')
    if ( action )
      this.execFormat(action)
    if ( target.getAttribute('data-link') ) {
      saveSelection()
      var anchor = getSelectionStart()
      if ( anchor.nodeName == 'A' )
        linkinputValue = anchor.getAttribute('href')
      else
        linkinputValue = ''
      this.setState({ 
        linkMode: true,
        linkinputStyles: {
          display: 'block',
          width: this.getToolbarDimensions().width
        }
      })
      setTimeout(function() {
        console.log('onToolbarClick');
        var anchor = this.refs.linkinput.getDOMNode()
        anchor.value = linkinputValue
        anchor.focus()
      }.bind(this), 4)
    }
  },
  onLinkinputChange: function(e) {
    linkinputValue = e.target.value
  },
  onLinkinputKeyUp: function(e) {
    if ( e.which == 13 )
      this.createLink()
  },
  onInjectinputKeyUp: function(e) {
    if ( e.which == 13 )
      this.execInject(e.target.value)
  },
  inject: function(type) {
    return function() {
      if(!this.isMounted()) return;
      saveSelection()
      
        this.setState({ injectMode: type })
        setTimeout(function() {
          if(!this.isMounted()) return;
          this.refs.injectinput.getDOMNode().focus()
        }.bind(this), 4)
      }.bind(this)
  },
  execInject: function(url) {
    if ( this.state.injectMode == 'image' ) {
      var image = new Image()
      var holder = document.createElement('div')
      holder.className = 'image'
      var container = document.createElement('div')
      container.className = 'image-container static'
      container.setAttribute('data-static', 'true')
      container.setAttribute('data-static-type', 'image')
      container.appendChild(holder)
      holder.appendChild(image)
      image.onload = function(e) {
        var ratio = 
        holder.style.paddingBottom = ( (this.height/this.width)*100 )+'%'
        holder.style.height = 0
        container.style.maxWidth = this.width+'px'
        this.style.position = 'absolute'
        this.style.maxWidth = '100%'
        insertNode(container, true)
      }
      image.onerror = function() {
        console.log('Image not found')
      }
      image.src = url
    }
    this.resetInject()
  },
  resetInject: function() {
    this.refs.injectinput.getDOMNode().value = '';
    if(this.isMounted()) {
      this.setState({ injectMode: false })  
    }
    
    restoreSelection()
  },
  execFormat: function(action) {
    var selectionElement = getBlockElement(this.selection.anchorNode)
    if ( blockTags.indexOf(action) != -1 ) {
      if (selectionElement && selectionElement.tagName === action.toUpperCase())
        action = 'p'
      document.execCommand('formatBlock', false, action)
    }
    if( action == 'justifycenter' && selectionElement.style.textAlign=='center' ) {
      selectionElement.style.textAlign = ''
      if ( selectionElement.getAttribute('style') === null )
        selectionElement.removeAttribute('style')
      this.onChange()
    } else
      document.execCommand(action, false, null)
  },
  render: function() {
    var editor = (
      <div className="editor"
        ref="editor"
        contentEditable 
        onInput={this.onChange} 
        onBlur={this.onBlur} 
        onPaste={this.onPaste}
        onKeyUp={this.onKeyUp}
        onKeyDown={this.onKeyDown}
        data-editor="true"
      >
      </div>
    )
    var toolbarStyles = this.state.toolStyles
    var linkinputStyles = this.state.linkinputStyles
    var arrowStyles = {
      top: this.state.arrowTop,
      left: this.state.arrowLeft
    }
    var injectStyles = this.state.injectStyles
    var injectClasses = ['inject']
    if ( this.state.injectMode )
      injectClasses.push('input', this.state.injectMode)
    var toolbarClasses = ['toolbar'].concat([this.state.toolbarMode])
    if ( this.state.linkMode )
      toolbarClasses.push('link')
    if ( !this.state.toolbarBelow )
      toolbarClasses.push('top')

    var isActive = (function() {
      var parentNode = getSelectionStart()
      var tags = []
      if ( parentNode && parentNode.tagName ) {
        while (parentNode.tagName && !parentNode.getAttribute('data-editor') ) {
          if ( parentNode.style.textAlign == 'center' )
            tags.push('CENTER')
          tags.push(parentNode.tagName)
          parentNode = parentNode.parentNode
        }
      }
      return function(nodeName) {
        return tags.indexOf(nodeName.toUpperCase()) != -1 ? ' active':''
      }
    }())

    return this.transferPropsTo(
      <div className="aino-editor" style={{ position: 'relative' }}>
        <div className={toolbarClasses.join(' ')} ref="toolbar" onClick={this.onToolbarClick} style={toolbarStyles}>
          <button className={"bold"+isActive('b')} data-action="bold"><i className="fa fa-bold"></i></button>
          <button className={"italic"+isActive('i')} data-action="italic"><i className="fa fa-italic"></i></button>
          <button className={"h1"+isActive('h1')} data-action="h1"><i className="fa fa-header"></i><small>1</small></button>
          <button className={"h2"+isActive('h2')} data-action="h2"><i className="fa fa-header"></i><small>2</small></button>
          <button className={"h3"+isActive('h3')} data-action="h3"><i className="fa fa-header"></i><small>3</small></button>
          <button className={"center"+isActive('center')} data-action="justifycenter"><i className="fa fa-align-center"></i></button>
          <button className={"list"+isActive('li')} data-action="insertunorderedlist"><i className="fa fa-list-ul"></i></button>
          <button className={"link"+isActive('a')} data-link><i className="fa fa-link"></i></button>
          <span className="arr" style={arrowStyles}/>
          <div className="linkinput" style={linkinputStyles}>
            <input type="text" ref="linkinput" onInput={this.onLinkinputChange} onKeyUp={this.onLinkinputKeyUp} placeholder="Paste or type a link" />
            <span className="close" />
          </div>
        </div>
        <div className={injectClasses.join(' ')} style={injectStyles}>
          <button onClick={this.inject('image')}><i className="fa fa-image" /></button>
          <button onClick={this.inject('youtube')}><i className="fa fa-youtube-play" /></button>
          <span className="arr" />
          <div className="injectinput">
            <input type="text" ref="injectinput" onKeyUp={this.onInjectinputKeyUp} placeholder={"Insert "+this.state.injectMode+" URL and press enter"} />
          </div>
        </div>
        {editor}
      </div>
    )
  }
})