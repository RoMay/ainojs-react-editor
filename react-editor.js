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

var getSelectionBlockElement = function(el) {
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

var selectionInEditor = function() {
  var selection = document.getSelection()
  var range = selection.getRangeAt(0)
  var current = range.commonAncestorContainer
  var parent = current.parentNode
  var result
  var getEditorElement = function(e) {
    var parent = e
    try {
      while (!parent.getAttribute('data-editor'))
        parent = parent.parentNode
    } catch (errb) {
        return false
    }
    return !!parent
  }

  // First try on current node
  try {
    if (current.getAttribute('data-editor')) {
      result = current
    } else {
      result = getEditorElement(parent)
    }
    // If not search in the parent nodes.
  } catch (err) {
    result = getEditorElement(parent)
  }
  return !!result
}

var insertNode = function(nodeType) {
  var selection = document.getSelection()
  var range = selection.getRangeAt(0)
  var node = document.createElement(nodeType)
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
      keepToolbarAlive: false,
      toolStyles: {display: 'none'},
      linkInputStyles: {display: 'none'},
      arrowLeft: 0,
      arrowTop: 0,
      toolbarBelow: false,
      toolbarMode: 'default',
      linkMode: false
    }
  },

  selection: '',
  selectionRange: null,
  getElement: function() {
    return this.refs.editor.getDOMNode()
  },
  checkSelection: function(e) {

    var newSelection
    var selectionElement

    if( e && this.state.linkMode ) {
      if ( e.target == this.refs.linkinput.getDOMNode() )
        return
      else
        this.createLink()
    }

    // tick the selection check
    setTimeout(function() {
      
      if ( !this.state.linkMode ) {

        newSelection = document.getSelection()

        if ( !newSelection.toString().trim() || !selectionInEditor() )
          this.hideToolbar()
        else {
          this.selection = newSelection
          this.selectionRange = this.selection.getRangeAt(0)
          this.showToolbar()
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
    if ( linkinputValue )
      document.execCommand('createLink', false, linkinputValue)
    else
      document.execCommand('unlink', false, null)
  },
  componentDidMount: function() {

    // remove the react bindings and re-insert the markup as plain HTML
    var node = this.getElement()
    var html = node.innerHTML.replace(/\s?data-reactid=\"[^\"]+\"/g,'')
    node.innerHTML = html
    this.setState({ html: html })
    document.documentElement.addEventListener('mouseup', this.checkSelection)
  },
  componentWillUnmount: function() {s
    document.documentElement.removeEventListener('mouseup', this.checkSelection)
  },
  hideToolbar: function() {
    this.setState({
      toolStyles: { display: 'none' }
    })
  },
  showToolbar: function() {

    var block = getSelectionBlockElement(document.getSelection().anchorNode)
    this.setState({
      toolbarMode: ( /^(H1|H2|H3|H4|H5|H6)$/.test(block.nodeName) ) ? 'heading' : 'default' 
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
    var cleft = containerRect.left
    var sel = document.getSelection()
    var range = sel.getRangeAt(0)
    var selection = range.getBoundingClientRect()
    var top = selection.top - containerRect.top
    var left = selection.left - cleft
    var isUnder = selection.top < dim.height + 10
    var center = (selection.left + selection.width/2) - dim.width/2
    var arrDiff = 0
    var selectionData = getSelectionBlockElement(sel.anchorNode)

    if ( center-cleft < -cleft )
      arrDiff = center

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
    if ( e.which === 13 && !e.shiftKey && node.tagName != 'LI' ) {
      document.execCommand('formatBlock', false, 'p')
      if ( node.tagName == 'A' )
        document.execCommand('unlink', false, null)
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
      var br = insertNode('br')
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
    var action = e.target.getAttribute('data-action')
    if ( action )
      this.execFormat(action)
    if ( e.target.getAttribute('data-link') ) {
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
  execFormat: function(action) {
    var selectionElement = getSelectionBlockElement(this.selection.anchorNode)
    if ( blockTags.indexOf(action) != -1 ) {
      if (selectionElement.tagName === action.toUpperCase())
        action = 'p'
      document.execCommand('formatBlock', false, action)
    }
    if( action == 'justifycenter' && selectionElement.style.textAlign=='center' )
      action = 'justifyleft'
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
        {this.props.children}
      </div>
    )
    var toolbarStyles = this.state.toolStyles
    var linkinputStyles = this.state.linkinputStyles
    var arrowStyles = {
      top: this.state.arrowTop,
      left: this.state.arrowLeft
    }
    var toolbarClasses = ['toolbar'].concat([this.state.toolbarMode])
    if ( this.state.linkMode )
      toolbarClasses.push('link')
    if ( !this.state.toolbarBelow )
      toolbarClasses.push('top')

    var isActive = function(nodeName) {
      var parentNode = getSelectionStart()
      if ( !parentNode || !parentNode.tagName )
        return ''
      while (parentNode.tagName && !parentNode.getAttribute('data-editor') ) {
        if ( parentNode.tagName.toLowerCase() == nodeName || ( nodeName == 'center' && parentNode.style.textAlign == 'center' ) )
          return ' active'
        parentNode = parentNode.parentNode
      }
      return ''
    }

    return this.transferPropsTo(
      <div className="aino-editor" style={{ position: 'relative' }}>
        <div className={toolbarClasses.join(' ')} ref="toolbar" onClick={this.onToolbarClick} style={toolbarStyles}>
          <button className={"bold"+isActive('b')} data-action="bold">B</button>
          <button className={"italic"+isActive('i')} data-action="italic">i</button>
          <button className={"h1"+isActive('h1')} data-action="h1">h1</button>
          <button className={"h2"+isActive('h2')} data-action="h2">h2</button>
          <button className={"h3"+isActive('h3')} data-action="h3">h3</button>
          <button className={"center"+isActive('center')} data-action="justifycenter">+</button>
          <button className={"list"+isActive('li')} data-action="insertunorderedlist">li</button>
          <button className={"link"+isActive('a')} data-link>a</button>
          <span className="arr" style={arrowStyles}/>
          <div className="linkinput" style={linkinputStyles}>
            <input type="text" ref="linkinput" onInput={this.onLinkinputChange} onKeyUp={this.onLinkinputKeyUp} placeholder="Paste or type a link" />
            <span className="close" />
          </div>
        </div>
        {editor}
      </div>
    )
  }
})