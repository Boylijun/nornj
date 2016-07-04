﻿'use strict';

var nj = require('../core'),
  utils = require('../utils/utils'),
  tranString = require('./transformToString'),
  tranComponent = require('./transformToComponent'),
  compileStringTmpl = require('../checkElem/checkStringElem');

//编译模板并返回转换函数
function compile(obj, tmplName, isComponent, isTag) {
  if (!obj) {
    return;
  }

  var root;
  if (tmplName) {
    root = nj.templates[tmplName];
  }
  if (!root) {
    //If obj is Object,we think obj is a precompiled template
    if (utils.isObject(obj) && obj.type === 'nj_root') {
      root = obj;
    }
    else {
      root = _createRoot();

      //Auto transform string template to array
      if (utils.isString(obj)) {
        obj = compileStringTmpl(obj);
      }

      //分析传入参数并转换为节点树对象
      if (isTag) {
        utils.checkTagElem(obj, root);
      }
      else {
        utils.checkElem(obj, root);
      }
    }

    //保存模板编译结果到全局集合中
    if (tmplName) {
      nj.templates[tmplName] = root;
    }
  }

  return function () {
    var args = arguments,
      len = args.length,
      data;

    if (len <= 0) {
      data = {};
    }
    else if (len === 1) {
      data = args[0];
    }
    else {
      data = [];
      utils.each(args, function (item) {
        data[data.length] = item;
      }, false, true);
    }

    var ret;
    if (isComponent) {  //转换组件
      ret = tranComponent.transformToComponent(root.content[0], data);
      if (utils.isArray(ret)) {  //组件最外层必须是单一节点对象
        ret = ret[0];
      }
    }
    else {  //转换字符串
      ret = tranString.transformContentToString(root.content, data);
    }
    return ret;
  };
}

//Create template root object
function _createRoot() {
  var root = utils.lightObj();
  root.type = 'nj_root';
  root.content = [];

  return root;
}

//编译字面量并返回组件转换函数
function compileComponent(obj, tmplName) {
  return compile(obj, tmplName, true);
}

//编译标签并返回组件转换函数
function compileTagComponent(obj, tmplName) {
  return compile(obj, tmplName, true, true);
}

//渲染标签组件
function renderTagComponent(data, selector) {
  var tags = utils.getTagComponents(selector),
    ret = [];

  utils.each(tags, function (tag) {
    var tmpl = compileTagComponent(tag, tag.getAttribute(nj.tagId)),
      parentNode = tag.parentNode;

    if (nj.componentLib === 'inferno') {
      utils.removeChildNode(parentNode);
    }
    ret.push(nj.componentRender(tmpl(data), parentNode));
  }, false, true);

  return ret;
}

//Precompile template
function precompile(obj) {
  var root = _createRoot();
  utils.checkElem(obj, root);

  return root;
}

//Render tmpl expression block
var _renderTmplExpr = compileComponent(compileStringTmpl('<{container}>{tmpl}</{container}>'), 'tmplExpr');
function renderTmplExpr(tmpl, data, container) {
  if (!container) {
    container = 'div';
  }

  var extra = { tmpl: tmpl, container: container },
    datas;

  if (utils.isArray(data)) {
    datas = data;
    datas[datas.length] = extra;
  }
  else {
    datas = [data, extra];
  }

  return _renderTmplExpr(datas);
}

module.exports = {
  compile: compile,
  compileComponent: compileComponent,
  compileTagComponent: compileTagComponent,
  renderTagComponent: renderTagComponent,
  precompile: precompile,
  renderTmplExpr: renderTmplExpr
};