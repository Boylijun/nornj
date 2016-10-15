﻿'use strict';

var nj = require('./core'),
  utils = require('./utils/utils'),
  compiler = require('./compiler/compile'),
  compileStringTmpl = require('./checkElem/checkStringElem'),
  tmplByKey = require('./utils/tmplByKey'),
  docReady = require('./utils/docReady');

nj.compileStringTmpl = compileStringTmpl;
nj.tmplByKey = tmplByKey;
nj.docReady = docReady;
utils.assign(nj, compiler, utils);

//Create vml tag namespace(primarily for IE8)
utils.registerTagNamespace();

//Default use React as component engine
if (typeof React !== 'undefined') {
  setComponentEngine('react', React, typeof ReactDOM !== 'undefined' ? ReactDOM : null);
}

var global;
if (typeof self !== 'undefined') {
  global = self;

  //Init tag template
  docReady(function () {
    if (nj.componentLib && nj.autoRenderTag) {
      nj.renderTagComponent(nj.initTagData);
    }
  });
}
else {
  global = this;
}

module.exports = global.NornJ = global.nj = nj;