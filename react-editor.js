/** @jsx React.DOM */

var React = require('react')
var Detect = require('ainojs-detect')

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

var getSelectionStart = function() {
  var node = document.getSelection().anchorNode
  return node && node.nodeType === 3 ? node.parentNode : node
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

module.exports = React.createClass({
  getInitialState: function() {
    return { html: ''}
  },
  componentDidMount: function() {
    // remove the react bindings and re-insert the markup as plain HTML
    var node = this.getDOMNode()
    var html = node.innerHTML.replace(/\s?data-reactid=\"[^\"]+\"/g,'')
    node.innerHTML = html
    this.setState({ html: html })
  },
  onKeyUp: function(e) {
    var node = getSelectionStart()

    if ( !node )
      return

    if ( node.tagName == 'PRE' )
      return false

    // fix safari’s paragraph creation
    if ( Detect.safari && node.textContent === '' )
      document.execCommand('formatBlock', false, 'p')

    // make sure linebreaks converts to new paragraph
    if ( e.which === 13 && !e.shiftKey && node.tagName != 'LI' ) {
      document.execCommand('formatBlock', false, 'p')
      if ( node.tagName == 'A' )
        document.execCommand('unlink', false, null)
    }
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
    var html = this.getDOMNode().innerHTML
    if ( html != this.state.html ) {
      this.setState({ html: html })
      typeof this.props.onChange == 'function' && this.props.onChange(html)
    }
  },
  onPaste: function(e) {
    e.preventDefault()
    var clipboard = e.clipboardData
    var content = clipboard.getData('text/plain') || clipboard.getData('text/html')
    document.execCommand('insertHTML', false, toHTML(content))
  },
  render: function() {
    return this.transferPropsTo(
      <div className="editor" 
        contentEditable 
        onInput={this.onChange} 
        onBlur={this.onChange} 
        onPaste={this.onPaste}
        onKeyUp={this.onKeyUp}
        onKeyDown={this.onKeyDown}
      >
        {this.props.children}
      </div>
    )
  }
})