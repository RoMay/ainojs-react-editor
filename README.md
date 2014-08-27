React Editor
------------

A medium-inspired editor written as a React component.

Installation:
-------------

    npm install ainojs-react-editor

Usage example:

    <Editor onChange={this.onchange} html="<h2>Foo</h2><p>bar</p>" />

- `onChange` should be a callback that get’s called each time an edit has been made with the new markup as argument. 
- `html` is the initial markup as string.

You also need to include two CSS files:

- the `react-editor.css` file located in the package root
- the latest `font-awesome` css file (http://fortawesome.github.io/Font-Awesome/)
