(function(_g) {(function(f) {if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = f() } else if (typeof define === 'function' && define.amd) { define([], f.bind(_g)) } else { f() } })(function(define, module,exports) { var _m = (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* eslint-disable no-unused-vars */
'use strict';
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],2:[function(require,module,exports){
'use strict';

var nj = require('./core'),
  utils = require('./utils/utils'),
  setComponentEngine = utils.setComponentEngine,
  compiler = require('./compiler/compile'),
  registerComponent = require('./utils/registerComponent'),
  compileStringTmpl = require('./checkElem/checkStringElem'),
  docReady = require('./utils/docReady');

nj.setComponentEngine = setComponentEngine;
nj.setTmplRule = utils.setTmplRule;
nj.registerFilter = utils.registerFilter;
nj.registerExpr= utils.registerExpr;
nj.compileStringTmpl = compileStringTmpl;
nj.docReady = docReady;
utils.assign(nj, compiler, registerComponent);

//Create vml tag namespace(primarily for IE8)
utils.registerTagNamespace();

//Default use React as component engine
if (typeof React !== 'undefined') {
  setComponentEngine('react', React, typeof ReactDOM !== 'undefined' ? ReactDOM : null);
}

//Init tag template
if (typeof self !== 'undefined') {
  docReady(function () {
    if (nj.componentLib && nj.autoRenderTag) {
      nj.renderTagComponent(nj.initTagData);
    }
  });
}

module.exports = nj;
},{"./checkElem/checkStringElem":4,"./compiler/compile":6,"./core":10,"./utils/docReady":14,"./utils/registerComponent":18,"./utils/utils":23}],3:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('../utils/tools'),
  tranParam = require('../transforms/transformParam'),
  tranElem = require('../transforms/transformElement'),
  checkTagElem = require('./checkTagElem'),
  tmplRule = nj.tmplRule;

//检测元素节点
function checkElem(obj, parent) {
  var node = {},
    parentContent = !parent.hasElse ? 'content' : 'contentElse';

  if (!tools.isArray(obj)) {  //判断是否为文本节点
    if(tools.isObject(obj) && '_njShim' in obj) {  //Get the shim value
      obj = obj._njShim;
    }

    //if (tools.isString(obj)) {
    node.type = 'nj_plaintext';
    node.content = [tranParam.compiledParam(obj)];
    parent[parentContent].push(node);
    //}

    return;
  }

  var first = obj[0];
  if (tools.isString(first)) {  //第一个子节点为字符串
    var first = first,
      len = obj.length,
      last = obj[len - 1],
      isElemNode = false,
      control;

    //判断是否为xml标签
    var xmlOpenTag = tranElem.getXmlOpenTag(first),
      openTagName,
      hasCloseTag = false,
      isTmpl, isParamsExpr;

    if (xmlOpenTag) {  //tagname为xml标签时,则认为是元素节点
      openTagName = xmlOpenTag[1];

      if (!tranElem.isXmlSelfCloseTag(first)) {  //非自闭合标签才验证是否存在关闭标签
        hasCloseTag = tranElem.isXmlCloseTag(last, openTagName);
      }
      else {  //自闭合标签
        node.selfCloseTag = true;
      }
      isElemNode = true;
    }
    else {
      control = tranElem.isControl(first);
      if (!control) {  //tagname不为xml标签时,必须有结束标签才认为是元素节点
        var openTag = tranElem.getOpenTag(first);
        if (openTag) {
          openTagName = openTag[0];

          if (!tranElem.isSelfCloseTag(first)) {  //非自闭合标签
            hasCloseTag = tranElem.isCloseTag(last, openTagName);
            if (hasCloseTag) {
              isElemNode = true;
            }
          }
          else {  //如果是自闭合标签则直接认为是元素节点
            node.selfCloseTag = true;
            isElemNode = true;
          }
        }
      }
      else {  //为特殊节点,也可视为一个元素节点
        var ctrl = control[0].toLowerCase(),
          refer = control[1];
        isTmpl = tranElem.isTmpl(ctrl);
        isParamsExpr = tranElem.isParamsExpr(ctrl);

        node.type = 'nj_expr';
        node.expr = ctrl;
        if (refer != null) {
          node.refer = tranParam.compiledParam(refer);
        }

        if (tranElem.isControlCloseTag(last, ctrl)) {  //判断是否有流程控制块闭合标签
          hasCloseTag = true;
        }
        isElemNode = true;
      }
    }

    if (isElemNode) {  //判断是否为元素节点
      var elseIndex = -1,
        pushContent = true;

      if (!control) {
        node.type = openTagName;

        //If open tag has a brace,add the typeRefer param.
        var typeRefer = tranElem.getInsideBraceParam(openTagName);
        if (typeRefer) {
          node.typeRefer = tranParam.compiledParam(typeRefer[0]);
        }

        //获取openTag内参数
        var tagParams = tranElem.getOpenTagParams(first, !xmlOpenTag);
        if (tagParams) {
          if (!node.params) {
            node.params = tools.lightObj();
          }

          tools.each(tagParams, function (param) {
            node.params[param.key] = tranParam.compiledParam(param.value);
          }, false, true);
        }

        //Verify if self closing tag again, because the tag may be similar to "<br></br>".
        if (!node.selfCloseTag) {
          node.selfCloseTag = tranElem.verifySelfCloseTag(openTagName);
        }
      }
      else {  //为表达式块时判断是否有$else
        if (isTmpl) {  //模板元素
          pushContent = false;

          //将模板添加到父节点的params中
          tranElem.addTmpl(node, parent);
        }
        else if (isParamsExpr) {
          pushContent = false;

          //If this is params block, directly set on the "paramsExpr" property of the parent node.
          tranElem.addParamsExpr(node, parent);
        }
        else {
          elseIndex = tools.inArray(obj, tmplRule.exprRule + 'else');
        }
      }

      //放入父节点content内
      if (pushContent) {
        parent[parentContent].push(node);
      }

      //取出子节点集合
      var end = len - (hasCloseTag ? 1 : 0),
        content = obj.slice(1, (elseIndex < 0 ? end : elseIndex));
      if (content && content.length) {
        checkContentElem(content, node);
      }

      //如果有$else,则将$else后面的部分存入content_else集合中
      if (elseIndex >= 0) {
        var contentElse = obj.slice(elseIndex + 1, end);
        node.hasElse = true;

        if (contentElse && contentElse.length) {
          checkContentElem(contentElse, node);
        }
      }
    }
    else {  //如果不是元素节点,则为节点集合
      checkContentElem(obj, parent);
    }
  }
  else if (tools.isArray(first)) {  //如果第一个子节点为数组,则该节点一定为节点集合(可以是多层数组嵌套的集合)
    checkContentElem(obj, parent);
  }
}

//检测子元素节点
function checkContentElem(obj, parent) {
  if (!parent.content) {
    parent.content = [];
  }
  if (parent.hasElse && !parent.contentElse) {
    parent.contentElse = [];
  }

  tools.each(obj, function (item) {
    checkElem(item, parent);
  }, false, true);
}

module.exports = {
  checkElem: checkElem,
  checkTagElem: checkTagElem
};
},{"../core":10,"../transforms/transformElement":12,"../transforms/transformParam":13,"../utils/tools":22,"./checkTagElem":5}],4:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('../utils/tools'),
  tranElem = require('../transforms/transformElement'),
  REGEX_SPLIT = /\$\{\d+\}/,
  tmplRule = nj.tmplRule,
  shim = require('../utils/shim');

//Cache the string template by unique key
nj.strTmpls = {};

//Compile string template
function compileStringTmpl(tmpl) {
  var isStr = tools.isString(tmpl),
    tmplKey;

  //Get unique key
  if (isStr) {
    tmpl = _clearNotesAndBlank(tmpl);
    tmplKey = tools.uniqueKey(tmpl);
  }
  else {
    var fullXml = '';
    tools.each(tmpl, function (xml) {
      fullXml += xml;
    }, false, true);

    tmplKey = tools.uniqueKey(_clearNotesAndBlank(fullXml));
  }

  //If the cache already has template data,then return the template
  var ret = nj.strTmpls[tmplKey];
  if (ret) {
    return ret;
  }

  var xmls = tmpl,
    args = arguments,
    splitNo = 0,
    params = [];

  ret = '';
  if (isStr) {
    xmls = tmpl.split(REGEX_SPLIT);
  }

  //Connection xml string
  var l = xmls.length;
  tools.each(xmls, function (xml, i) {
    var split = '';
    if (i < l - 1) {
      var arg = args[i + 1],
        last = xml.length - 1,
        useShim = xml[last] === '@';

      if (!tools.isString(arg) || useShim) {
        split = '_nj-split' + splitNo + '_';

        //Use the shim function to convert the parameter when the front of it with a "@" mark.
        if (useShim) {
          xml = xml.substr(0, last);
          arg = shim(arg);
        }

        params.push(arg);
        splitNo++;
      }
      else {
        split = arg;
      }
    }

    ret += xml + split;
  }, false, true);

  //Resolve string to element
  ret = _checkStringElem(isStr ? ret : _clearNotesAndBlank(ret), params);

  //Save to the cache
  nj.strTmpls[tmplKey] = ret;
  return ret;
}

//Resolve string to element
function _checkStringElem(xml, params) {
  var root = [],
    current = {
      elem: root,
      elemName: 'root',
      parent: null
    },
    parent = null,
    pattern = tmplRule.checkElem(),
    matchArr;

  while ((matchArr = pattern.exec(xml))) {
    var textBefore = matchArr[1],
      elem = matchArr[2],
      elemName = matchArr[3],
      textAfter = matchArr[4];

    //Text before tag
    if (textBefore) {
      if (/\s/.test(textBefore[textBefore.length - 1])) {
        textBefore = _formatText(textBefore);
      }
      _setText(textBefore, current.elem, params);
    }

    //Element tag
    if (elem) {
      if (elemName[0] === '/') {  //Close tag
        if (elemName === '/' + current.elemName) {
          current = current.parent;
        }
      }
      else if (elem[elem.length - 2] === '/') {  //Self close tag
        _setSelfCloseElem(elem, elemName, current.elem, params);
      }
      else {  //Open tag
        parent = current;
        current = {
          elem: [],
          elemName: elemName,
          parent: parent
        };

        parent.elem.push(current.elem);
        _setElem(elem, elemName, current.elem, params);
      }
    }

    //Text after tag
    if (textAfter) {
      if (/\s/.test(textAfter[0])) {
        textAfter = _formatText(textAfter);
      }
      _setText(textAfter, current.elem, params);
    }
  }

  return root;
}

function _clearNotesAndBlank(str) {
  return str.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+([^\s<]*)\s+</g, '>$1<').trim();
}

function _formatText(str) {
  return str.replace(/\n/g, '').trim();
}

//Set element node
function _setElem(elem, elemName, elemArr, params, bySelfClose) {
  var ret;
  if (elemName[0] === tmplRule.exprRule) {
    ret = elem.substring(1, elem.length - 1);
  }
  else {
    ret = elem;
  }

  if (bySelfClose) {
    elemArr.push([ret]);
  }
  else {
    elemArr.push(ret);
  }
}

//Set self close element node
function _setSelfCloseElem(elem, elemName, elemArr, params) {
  if (elemName === tmplRule.exprRule + 'else') {
    elemArr.push(elem.substr(1, 5));
  }
  else {
    _setElem(elem, elemName, elemArr, params, true);
  }
}

//Set text node
function _setText(text, elemArr, params) {
  var pattern = /_nj-split(\d+)_/g, matchArr,
    splitNos = [];

  while ((matchArr = pattern.exec(text))) {
    splitNos.push(matchArr[1]);
  }

  if (splitNos.length) {
    tools.each(text.split(/_nj-split(?:\d+)_/), function (t) {
      if (t !== '') {
        elemArr.push(t);
      }

      var no = splitNos.shift();
      if (no != null) {
        elemArr.push(params[no]);
      }
    }, false, true);
  }
  else {
    elemArr.push(text);
  }
}

module.exports = compileStringTmpl;
},{"../core":10,"../transforms/transformElement":12,"../utils/shim":21,"../utils/tools":22}],5:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('../utils/tools'),
  tranParam = require('../transforms/transformParam'),
  tranElem = require('../transforms/transformElement'),
  tmplRule = nj.tmplRule;

//检测标签元素节点
function checkTagElem(obj, parent) {
  var node = {},
    nodeType = obj.nodeType,
    nodeValue = tools.trim(obj.nodeValue),
    parentContent = !parent.hasElse ? 'content' : 'contentElse';

  //处理文本节点
  if (nodeType === 3) {
    if (nodeValue === '') {
      return;
    }

    node.type = 'nj_plaintext';
    node.content = [tranParam.compiledParam(nodeValue)];
    parent[parentContent].push(node);

    return;
  }

  //处理元素节点
  if (nodeType === 1) {
    var tagName = tranElem.getTagComponentName(obj),
      params = tranElem.getTagComponentAttrs(obj),
      isControl = tranElem.isTagControl(tagName),
      pushContent = true;

    if (isControl) {  //特殊节点
      if (tagName !== tmplRule.exprRule + 'else') {
        tagName = tagName.substr(1);
        node.type = 'nj_expr';
        node.expr = tagName;

        if (tranElem.isTmpl(tagName)) {  //模板元素
          pushContent = false;

          //将模板添加到父节点的params中
          tranElem.addTmpl(node, parent);
        }
        else if (tranElem.isParamsExpr(tagName)) {
          pushContent = false;

          //If this is params block, directly set on the "paramsExpr" property of the parent node.
          tranElem.addParamsExpr(node, parent);
        }
        else {  //Expression block
          if (params && params.refer) {
            var retR = tranElem.getInsideBraceParam(params.refer);
            node.refer = tranParam.compiledParam(retR ? retR[0] : params.refer);
          }
        }
      }
      else {  //else节点
        pushContent = false;

        //将else标签内的子节点放入当前父节点的contentElse中
        node = parent;
        node.hasElse = true;
      }
    }
    else {  //元素节点
      node.type = tagName;

      //If open tag has a brace,add the typeRefer param.
      var typeRefer = tranElem.getInsideBraceParam(tagName);
      if (typeRefer) {
        node.typeRefer = tranParam.compiledParam(typeRefer[0]);
      }

      if (params) {
        node.params = tranParam.compiledParams(params);
      }

      //Verify if self closing tag again, because the tag may be similar to "<br></br>".
      node.selfCloseTag = tranElem.verifySelfCloseTag(tagName);
    }

    //放入父节点content内
    if (pushContent) {
      parent[parentContent].push(node);
    }

    //处理子元素
    var childNodes = obj.childNodes;
    if (childNodes && childNodes.length) {
      checkTagContentElem(childNodes, node);
    }
  }
}

//检测标签子元素节点
function checkTagContentElem(obj, parent) {
  if (!parent.content) {
    parent.content = [];
  }
  if (parent.hasElse && !parent.contentElse) {
    parent.contentElse = [];
  }

  tools.each(obj, function (item) {
    checkTagElem(item, parent);
  }, false, true);
}

//Set init data for tag component
nj.setInitTagData = function (data) {
  nj.initTagData = data;
};

module.exports = checkTagElem;
},{"../core":10,"../transforms/transformElement":12,"../transforms/transformParam":13,"../utils/tools":22}],6:[function(require,module,exports){
'use strict';

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
var _renderTmplExpr = compileComponent(['<{container}>', '{tmpl}'], 'tmplExpr');
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
},{"../checkElem/checkStringElem":4,"../core":10,"../utils/utils":23,"./transformToComponent":8,"./transformToString":9}],7:[function(require,module,exports){
'use strict';

var utils = require('../utils/utils');

module.exports = function (transformNode, useString) {
  return function (content, data, parent, paramsExpr) {
    var ret = null;
    if (useString) {
      ret = '';
    }

    if (!content) {
      return ret;
    }
    if (!parent) {  //Init a parent data object and cascade pass on the children node
      parent = utils.lightObj();
      if (data) {
        parent.data = utils.isArray(data) ? data[0] : data;
      }
    }

    if (!useString) {
      ret = [];
    }
    utils.each(content, function (obj) {
      var retN = transformNode(obj, data, parent, paramsExpr);
      if (!useString) {
        utils.listPush(ret, retN, true, true);
      }
      else {
        ret += retN;
      }
    }, false, true);

    return ret;
  };
};
},{"../utils/utils":23}],8:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  utils = require('../utils/utils'),
  transformContentToComponent = require('./transformContent')(transformToComponent),  //转换子节点为组件节点
  errorTitle = nj.errorTitle;

//转换节点为组件节点
function transformToComponent(obj, data, parent, paramsExpr) {
  var ret = null;

  if (obj.type === 'nj_plaintext') {
    //替换插入在文本中的参数
    ret = utils.replaceParams(obj.content[0], data, true, false, parent, false);

    //执行模板数据
    if (utils.isObject(ret) && ret.expr === 'tmpl') {
      ret = transformContentToComponent(ret.content, data, parent);
    }
  }
  else if (obj.type === 'nj_expr') {  //Expression block
    var dataRefer = utils.getExprParam(obj.refer, data, parent, false),
      hasElse = obj.hasElse,
      expr = nj.exprs[obj.expr],
      itemIsArray;

    utils.throwIf(expr, errorTitle + 'Expression "' + obj.expr + '" is undefined, please check it has been registered.');

    //Create expression's context object and set parameters
    var thisObj = utils.lightObj();
    thisObj.data = data;
    if (parent) {
      thisObj.parent = parent.parent;
      thisObj.index = parent.index;
    }
    thisObj.useString = false;
    thisObj.paramsExpr = paramsExpr;
    thisObj.result = function (param) {
      if (param && param.loop) {
        if (itemIsArray == null) {
          itemIsArray = utils.isArray(data);
        }

        //Create a parent data object
        var _parent = utils.lightObj();
        _parent.data = param.item;
        _parent.parent = parent;
        _parent.index = param.index;

        return transformContentToComponent(obj.content, utils.getItemParam(param.item, data, itemIsArray), _parent, paramsExpr);
      }
      else {
        return transformContentToComponent(obj.content, data, parent, paramsExpr);
      }
    };
    thisObj.inverse = function () {
      return hasElse ? transformContentToComponent(obj.contentElse, data, parent, paramsExpr) : null;
    };

    //Execute expression block
    ret = expr.apply(thisObj, dataRefer);
  }
  else {
    //如果有相应组件,则使用组件类作为type值
    var componentClass = nj.componentClasses[obj.type.toLowerCase()],
      type = componentClass ? componentClass : obj.type;

    //If typeRefer isn't undefined,use it to replace the node type.
    if (obj.typeRefer) {
      var typeRefer = utils.replaceParams(obj.typeRefer, data, true, false, parent, false);
      if (typeRefer) {
        type = typeRefer;
      }
    }

    //Make parameters from the parameters expression.
    var exprP = obj.paramsExpr,
      paramsE;
    if (exprP) {
      paramsE = utils.lightObj();
      transformContentToComponent(exprP.content, data, parent, paramsE);
    }

    //Make React.createElement's parameters
    var params = [type,                                                  //组件名
      utils.transformParamsToObj(obj.params, data, parent, paramsE)],    //参数
      content = transformContentToComponent(obj.content, data, parent);  //子组件
    if (content) {
      utils.listPush(params, content);
    }

    //调用创建组件接口,必须需要用apply以多个参数的形式传参,否则在react中,元素放在数组里时会报需要加key属性的警告
    ret = nj.componentPort.apply(nj.componentLibObj, params);
  }

  return ret;
}

module.exports = {
  transformToComponent: transformToComponent,
  transformContentToComponent: transformContentToComponent
};
},{"../core":10,"../utils/utils":23,"./transformContent":7}],9:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  utils = require('../utils/utils'),
  transformContent = require('./transformContent'),
  transformContentToString = transformContent(transformToString, true),  //转换子节点为字符串
  transformContentToArray = transformContent(transformToString, false),  //转换子节点为数组
  errorTitle = nj.errorTitle;

//转换节点为字符串
function transformToString(obj, data, parent, paramsExpr) {
  var ret = '';

  if (obj.type === 'nj_plaintext') {
    //替换插入在文本中的参数
    ret = utils.replaceParams(obj.content[0], data, false, false, parent, true);
  }
  else if (obj.type === 'nj_expr') {  //Expression block
    var dataRefer = utils.getExprParam(obj.refer, data, parent, true),
      hasElse = obj.hasElse,
      expr = nj.exprs[obj.expr],
      itemIsArray;

    utils.throwIf(expr, errorTitle + 'Expression "' + obj.expr + '" is undefined, please check it has been registered.');

    //Create expression's context object and set parameters
    var thisObj = utils.lightObj();
    thisObj.data = data;
    if (parent) {
      thisObj.parent = parent.parent;
      thisObj.index = parent.index;
    }
    thisObj.useString = true;
    thisObj.paramsExpr = paramsExpr;
    thisObj.result = function (param) {
      if (param && param.loop) {
        if (itemIsArray == null) {
          itemIsArray = utils.isArray(data);
        }

        //Create a parent data object
        var _parent = utils.lightObj();
        _parent.data = param.item;
        _parent.parent = parent;
        _parent.index = param.index;

        return transformContentToString(obj.content, utils.getItemParam(param.item, data, itemIsArray), _parent, paramsExpr);
      }
      else {
        return transformContentToString(obj.content, data, parent, paramsExpr);
      }
    };
    thisObj.inverse = function () {
      return hasElse ? transformContentToString(obj.contentElse, data, parent, paramsExpr) : null;
    };

    //Execute expression block
    ret = expr.apply(thisObj, dataRefer);
  }
  else {
    var type = obj.type;

    //If typeRefer isn't undefined,use it to replace the node type.
    if (obj.typeRefer) {
      var typeRefer = utils.replaceParams(obj.typeRefer, data, false, false, parent, true);
      if (typeRefer) {
        type = typeRefer;
      }
    }

    //Make parameters from the parameters expression.
    var exprP = obj.paramsExpr,
      paramsE;
    if (exprP) {
      paramsE = utils.lightObj();
      transformContentToArray(exprP.content, data, parent, paramsE);
    }

    var openTag = '<' + type + utils.transformParams(obj.params, data, parent, paramsE);
    if (!obj.selfCloseTag) {
      ret = openTag + '>' + transformContentToString(obj.content, data, parent) + '</' + type + '>';
    }
    else {  //自闭合标签
      ret = openTag + '/>';
    }
  }

  return ret;
}

module.exports = {
  transformToString: transformToString,
  transformContentToString: transformContentToString
};
},{"../core":10,"../utils/utils":23,"./transformContent":7}],10:[function(require,module,exports){
'use strict';

function nj() {
  return nj.compileStringTmpl.apply(null, arguments);
}

nj.componentLib = null;
nj.componentLibObj = null;
nj.componentLibDom = null;
nj.componentPort = null;
nj.componentRender = null;
nj.componentClasses = {};
nj.namespace = 'nj';
nj.tagNamespaces = { nj: 'nj' };
nj.tagId = 'nj-id';
nj.tagStyle = 'nj-style';
nj.tagClassName = 'nj-component';
nj.templates = {};
nj.errorTitle = 'NornJ:';
nj.tmplRule = {};
nj.autoRenderTag = true;

module.exports = nj;
},{}],11:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('../utils/tools'),
  escape = require('../utils/escape'),
  errorTitle = nj.errorTitle;

//转换节点参数为字符串
function transformParams(obj, data, parent, paramsE) {
  var ret = '';

  //Attach parameters from "$param" expressions
  if (paramsE) {
    tools.each(paramsE, function (v, k) {
      if (!obj || obj[k] == null) {
        ret += ' ' + k + '="' + v + '"';
      }
    }, false, false);
  }

  tools.each(obj, function (v, k) {
    ret += ' ' + k + '="' + replaceParams(v, data, false, false, parent, true) + '"';
  }, false, false);

  return ret;
}

//转换节点参数为对象
function transformParamsToObj(obj, data, parent, paramsE) {
  var ret = obj || paramsE ? {} : null;

  //Attach parameters from "$param" expressions
  if (paramsE) {
    tools.assign(ret, paramsE);
  }

  tools.each(obj, function (v, k) {
    replaceParams(v, data, ret, k, parent, false);
  }, false, false);

  return ret;
}

//设置对象参数
function setObjParam(obj, key, value, notTran) {
  var style;
  if (!notTran && nj.componentLib) {
    switch (key) {
      case 'class':
        key = 'className';
        break;
      case 'for':
        key = 'htmlFor';
        break;
      case 'style':
      case nj.tagStyle:
        key = 'style';
        style = _getStyleParams(value);
        break;
    }
  }

  obj[key] = style != null ? style : value;
}

//提取style内参数
function _getStyleParams(obj) {
  //If the parameter is a style object,then direct return.
  if (tools.isObject(obj)) {
    return obj;
  }

  //参数为字符串
  var pattern = /([^\s:]+)[\s]?:[\s]?([^\s;]+)[;]?/g,
    matchArr, ret;

  while ((matchArr = pattern.exec(obj))) {
    var key = matchArr[1],
      value = matchArr[2];

    if (!ret) {
      ret = {};
    }

    //Convert to lowercase when style name is all capital.
    if(/^[A-Z-]+$/.test(key)) {
      key = key.toLowerCase();
    }

    //将连字符转为驼峰命名
    key = tools.toCamelCase(key);

    ret[key] = value;
  }

  return ret;
}

//Use filters
function _useFilters(filters, ret, data, parent, index, useString) {
  if (filters) {
    var filtersObj = nj.filters;
    tools.each(filters, function (filterObj) {
      var filter = filtersObj[filterObj.name];  //Get filter function
      if (!filter) {
        console.warn(errorTitle + 'A filter called ' + filterObj.name + ' is undefined.');
        return;
      }

      var params,
        paramsF = filterObj.params,
        thisObj = tools.lightObj();

      if (paramsF) {
        params = tools.listPush([ret], paramsF);
      }
      else {
        params = [ret];
      }

      thisObj.data = data;
      thisObj.parent = parent;
      thisObj.index = index;
      thisObj.useString = useString;
      ret = filter.apply(thisObj, params);
    }, false, true);
  }

  return ret;
}

//获取data值
function getDataValue(data, propObj, parent, defaultEmpty, useString) {
  //if (data == null) {
  //  return;
  //}

  var isArr = tools.isArray(data),
    prop = propObj.name,
    filters = propObj.filters,
    parentNum = propObj.parentNum,
    datas, ret, dataP, index;

  //if inside each block,get the parent data and current index
  if (parent && parent.parent) {
    dataP = parent.parent;
    index = parent.index;
  }

  //According to the param path to get data
  if (parent && parentNum) {
    for (var i = 0; i < parentNum; i++) {
      var _parent = parent.parent;
      tools.throwIf(_parent, errorTitle + 'Parent data is undefined, please check the param path declare.');
      parent = _parent;
      index = parent.index;
      datas = [parent.data];
    }
  }
  else if (isArr) {  //The data param is array
    datas = data;
  }
  else {
    datas = [data];
  }

  if (propObj.isStr) {
    ret = _useFilters(filters, prop, datas, dataP, index, useString);
  }
  else if (prop === '.') {  //prop为点号时直接使用data作为返回值
    ret = _useFilters(filters, isArr ? data[0] : data, datas, dataP, index, useString);
  }
  else if (prop === '#') {  //Get current item index
    ret = _useFilters(filters, index, datas, dataP, index, useString);
  }
  else {
    tools.each(datas, function (obj) {
      if (obj) {
        ret = obj[prop];
        if (ret != null) {
          //Use filters
          ret = _useFilters(filters, ret, datas, dataP, index, useString);

          return false;
        }
      }
    }, false, true, true);
  }

  //Default set empty
  if (defaultEmpty && ret == null) {
    ret = '';
  }

  return ret;
}

//获取each块中的item参数
function getItemParam(item, data, isArr) {
  var ret = item;
  if (isArr == null) {
    isArr = tools.isArray(data);
  }
  if (isArr) {
    ret = tools.listPush([item], data.slice(1));
  }

  return ret;
}

//替换参数字符串
function replaceParams(valueObj, data, newObj, newKey, parent, useString) {
  var props = valueObj.props,
    strs = valueObj.strs,
    isAll = valueObj.isAll,
    useObj = tools.isObject(newObj),  //newObj的值可能为对象或布尔值,此处判断是否为对象
    value = strs[0];

  if (props) {
    tools.each(props, function (propObj, i) {
      var dataProp = getDataValue(data, propObj.prop, parent, !newObj, useString);

      //参数为字符串时,须做特殊字符转义
      if (dataProp
        && !newObj            //Only in transform to string need escape
        && propObj.escape) {  //Only in the opening brace's length less than 2 need escape
        dataProp = escape(dataProp);
      }

      //如果参数只存在占位符,则可传引用参数
      if (isAll) {
        if (useObj) {  //在新对象上创建属性
          setObjParam(newObj, newKey, dataProp);
        }

        value = dataProp;
      }
      else {  //Splicing value by one by one
        value += dataProp + strs[i + 1];
      }
    }, false, true);
  }

  //存在多个占位符的情况
  if (useObj && !isAll) {
    setObjParam(newObj, newKey, value);
  }

  return value;
}

//Get expression parameter
function getExprParam(refer, data, parent, useString) {
  var ret = [];
  if (refer != null) {
    tools.each(refer.props, function (propObj, i) {
      ret.push(getDataValue(data, propObj.prop, parent, false, useString));
    }, false, true);
  }

  return ret;
}

module.exports = {
  transformParams: transformParams,
  transformParamsToObj: transformParamsToObj,
  replaceParams: replaceParams,
  getDataValue: getDataValue,
  getItemParam: getItemParam,
  setObjParam: setObjParam,
  getExprParam: getExprParam
};
},{"../core":10,"../utils/escape":15,"../utils/tools":22}],12:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('../utils/tools'),
  tranData = require('./transformData'),
  tranParam = require('./transformParam'),
  tmplRule = nj.tmplRule;

//提取xml open tag
function getXmlOpenTag(obj) {
  return tmplRule.xmlOpenTag.exec(obj);
}

//验证xml self close tag
var REGEX_XML_SELF_CLOSE_TAG = /^<[^>]+\/>$/i;
function isXmlSelfCloseTag(obj) {
  return REGEX_XML_SELF_CLOSE_TAG.test(obj);
}

//Verify self close tag name
var OMITTED_CLOSE_TAGS = {
  'area': true,
  'base': true,
  'br': true,
  'col': true,
  'embed': true,
  'hr': true,
  'img': true,
  'input': true,
  'keygen': true,
  'link': true,
  'meta': true,
  'param': true,
  'source': true,
  'track': true,
  'wbr': true
};
function verifySelfCloseTag(tagName) {
  return OMITTED_CLOSE_TAGS[tagName.toLowerCase()];
}

//Extract parameters inside the xml open tag
function getOpenTagParams(obj, noXml) {
  var pattern = /[\s]+([^\s={}>]+)(=(('[^']+')|("[^"]+")|([^"'\s]+)))?/g,
    matchArr, ret;

  while ((matchArr = pattern.exec(obj))) {
    var key = matchArr[1];
    if (key === '/' || key === '/>') {  //If match to the last "/" or "/>", then continue the loop.
      continue;
    }

    if (!ret) {
      ret = [];
    }

    var value = matchArr[3],
      charF, len, regex;
    if (value != null) {
      value = tools.clearQuot(value);  //Remove quotation marks
    }
    else {
      value = key;  //Match to Similar to "checked" or "disabled" attribute.
    }
    len = value.length;

    //Removed at the end of "/>" or ">".
    if (!noXml) {
      if (value.lastIndexOf('/>') === len - 2) {
        value = value.replace(/\/>/, '');
      }
      else if (value.lastIndexOf('>') === len - 1) {
        value = value.replace(/>/, '');
      }
    }

    ret.push({ key: key, value: value });
  }

  return ret;
}

//判断xml close tag
function isXmlCloseTag(obj, tagName) {
  return tools.isString(obj) && obj.toLowerCase() === '</' + tagName + '>';
}

//提取open tag
function getOpenTag(obj) {
  return tmplRule.openTag.exec(obj);
}

//验证self close tag
var REGEX_SELF_CLOSE_TAG = /\/$/i;
function isSelfCloseTag(obj) {
  return REGEX_SELF_CLOSE_TAG.test(obj);
}

//判断close tag
function isCloseTag(obj, tagName) {
  return tools.isString(obj) && obj.toLowerCase() === '/' + tagName.toLowerCase();
}

//get inside brace param
function getInsideBraceParam(obj) {
  return tmplRule.insideBraceParam.exec(obj);
}

//判断流程控制块并返回refer值
function isControl(obj) {
  var ret, ret1 = tmplRule.expr.exec(obj);
  if (ret1) {
    ret = [ret1[1]];

    var ret2 = getInsideBraceParam(obj);  //提取refer值
    if (ret2) {
      ret.push(ret2[0]);
    }
  }

  return ret;
}

//判断流程控制块close tag
function isControlCloseTag(obj, tagName) {
  return tools.isString(obj) && obj === '/' + tmplRule.exprRule + tagName;
}

//判断是否模板元素
function isTmpl(obj) {
  return obj === 'tmpl';
}

//加入到模板集合中
function addTmpl(node, parent) {
  var paramsP = parent.params;
  if (!paramsP) {
    paramsP = parent.params = tools.lightObj();
  }

  var tmpls = paramsP.tmpls;
  if (!tmpls) {
    paramsP.tmpls = tranParam.compiledParam([node]);
  }
  else {
    tmpls.strs[0].push(node);  //Insert the compiled template to the parameter name for "tmpls"'s "strs" array.
  }
}

//Test whether as parameters expression
function isParamsExpr(obj) {
  return obj === 'params';
}

//Add to the "paramsExpr" property of the parent node
function addParamsExpr(node, parent) {
  parent.paramsExpr = node;
}

//获取标签组件名
function getTagComponentName(el) {
  var tagName = el.tagName.toLowerCase();
  tools.each(nj.tagNamespaces, function (tagNamespace) {
    if (tagName.indexOf(tagNamespace + ':') === 0) {
      tagName = tagName.split(':')[1];
      return false;
    }
    else if (tagName.indexOf(tagNamespace + '-') === 0) {
      tagName = tagName.split('-')[1];
      return false;
    }
  }, false, false, true);

  return tagName;
}

//获取标签组件所有属性
function getTagComponentAttrs(el) {
  var attrs = el.attributes,
    ret;

  tools.each(attrs, function (obj) {
    var attrName = obj.nodeName;
    if (attrName !== nj.tagId && obj.specified) {  //此处如不判断specified属性,则低版本IE中会列出所有可能的属性
      var val = obj.nodeValue;
      if (!ret) {
        ret = tools.lightObj();
      }

      //Deal with the attribute only has key.
      if(val === '') {
        val = attrName;
      }

      if (attrName === 'style') {  //style属性使用cssText
        val = el.style.cssText;
      }
      else if (attrName.indexOf('data-') !== 0  //Transform to camel-case
        && attrName.indexOf(nj.namespace + '-') !== 0) {
        //Can be marked with an exclamation mark to distinguish the attribute name beginning with "data-".
        if(attrName.indexOf('!') === 0) {
          attrName = attrName.substr(1);
        }

        attrName = tools.toCamelCase(attrName);
      }

      tranData.setObjParam(ret, attrName, val, true);
    }
  });

  return ret;
}

//判断标签表达式块
function isTagControl(obj) {
  return tmplRule.expr.test(obj);
}

//获取全部标签组件
function getTagComponents(selector) {
  if (!selector) {
    selector = '.' + nj.tagClassName;
  }

  return document.querySelectorAll(selector);
}

//Remove all dom child node
function removeChildNode(node) {
  var children = node.childNodes,
    len = children.length,
    i = 0;

  for (; i < len; i++) {
    node.removeChild(node.firstChild);
  }
}

module.exports = {
  getXmlOpenTag: getXmlOpenTag,
  isXmlSelfCloseTag: isXmlSelfCloseTag,
  verifySelfCloseTag: verifySelfCloseTag,
  getOpenTagParams: getOpenTagParams,
  isXmlCloseTag: isXmlCloseTag,
  getOpenTag: getOpenTag,
  isSelfCloseTag: isSelfCloseTag,
  isCloseTag: isCloseTag,
  getInsideBraceParam: getInsideBraceParam,
  isControl: isControl,
  isControlCloseTag: isControlCloseTag,
  isTmpl: isTmpl,
  addTmpl: addTmpl,
  isParamsExpr: isParamsExpr,
  addParamsExpr: addParamsExpr,
  getTagComponentName: getTagComponentName,
  getTagComponentAttrs: getTagComponentAttrs,
  isTagControl: isTagControl,
  getTagComponents: getTagComponents,
  removeChildNode: removeChildNode
};
},{"../core":10,"../utils/tools":22,"./transformData":11,"./transformParam":13}],13:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('../utils/tools'),
  tmplRule = nj.tmplRule;

//Get compiled parameters from a object
function compiledParams(obj) {
  var ret = tools.lightObj();
  tools.each(obj, function (v, k) {
    ret[k] = compiledParam(v);
  }, false, false);

  return ret;
}

//Get compiled property
function compiledProp(prop, isString) {
  var ret = tools.lightObj();

  //Extract the dot data path to the 'prop' filter.
  if (!isString && prop.indexOf('.') > -1) {
    prop = prop.replace(/\.([^\s.:\/]+)/g, ':prop($1)');
  }

  //If there are colons in the property,then use filter
  if (prop.indexOf(':') >= 0) {
    var filters = [],
      filtersTmp;
    filtersTmp = prop.split(':');
    prop = filtersTmp[0].trim();  //Extract property

    filtersTmp = filtersTmp.slice(1);
    tools.each(filtersTmp, function (filter) {
      var retF = _getFilterParam(filter.trim()),
        filterObj = tools.lightObj(),
        filterName = retF[1].toLowerCase();  //Get filter name

      if (filterName) {
        var paramsF = retF[3];  //Get filter param

        //Multiple params are separated by commas.
        if (paramsF) {
          var params = [];
          tools.each(paramsF.split(','), function (p) {
            params[params.length] = p.trim();
          }, false, true);

          filterObj.params = params;
        }

        filterObj.name = filterName;
        filters.push(filterObj);
      }
    }, false, true);

    ret.filters = filters;
  }

  //Extract the parent data path
  if (!isString && prop.indexOf('../') > -1) {
    var n = 0;
    prop = prop.replace(/\.\.\//g, function () {
      n++;
      return '';
    });

    ret.parentNum = n;
  }

  ret.name = prop;
  if (isString) {  //Sign the parameter is a pure string.
    ret.isStr = true;
  }

  return ret;
}

//Get filter param
var REGEX_FILTER_PARAM = /([\w$]+)(\(([^()]+)\))*/;
function _getFilterParam(obj) {
  return REGEX_FILTER_PARAM.exec(obj);
}

//Extract replace parameters
var _quots = ['\'', '"'];
function _getReplaceParam(obj, strs) {
  var pattern = tmplRule.replaceParam(),
    patternP = /[^\s:]+([\s]?:[\s]?[^\s\(\)]+(\([^\(\)]+\))?(\.[^\s.]+)?){0,}/g,
    matchArr, matchArrP, ret, prop, i = 0;

  while ((matchArr = pattern.exec(obj))) {
    if (!ret) {
      ret = [];
    }

    var j = 0;
    prop = matchArr[3];

    //To extract parameters by interval space.
    while ((matchArrP = patternP.exec(prop))) {
      var propP = matchArrP[0],
        item = [matchArr[0], matchArr[1], propP, false, true];

      //Clear parameter at both ends of the space.
      propP = propP.trim();

      //If parameter has quotation marks, this's a pure string parameter.
      if (_quots.indexOf(propP.charAt(0)) > -1) {
        propP = tools.clearQuot(propP);
        item[3] = true;
      }

      item[2] = propP;
      ret.push(item);

      //If there are several parameters in a curly braces, fill the space for the "strs" array.
      if (j > 0) {
        item[4] = false;  //Sign not contain all of placehorder
        strs.splice(++i, 0, '');
      }
      j++;
    }
    i++;
  }

  return ret;
}

//Get compiled parameter
function compiledParam(value) {
  var ret = tools.lightObj(),
    strs = tools.isString(value) ? value.split(tmplRule.replaceSplit) : [value],
    props = null,
    isAll = false;

  //If have placehorder
  if (strs.length > 1) {
    var params = _getReplaceParam(value, strs);
    props = [];

    tools.each(params, function (param) {
      var retP = tools.lightObj();
      isAll = param[4] ? param[0] === value : false;  //If there are several parameters in a curly braces, "isAll" must be false.
      retP.prop = compiledProp(param[2], param[3]);

      //If parameter's open rules are several,then it need escape.
      retP.escape = param[1].split(tmplRule.beginRule).length < 3;
      props.push(retP);
    }, false, true);
  }

  ret.props = props;
  ret.strs = strs;
  ret.isAll = isAll;
  return ret;
}

module.exports = {
  compiledParam: compiledParam,
  compiledParams: compiledParams,
  compiledProp: compiledProp
};
},{"../core":10,"../utils/tools":22}],14:[function(require,module,exports){
'use strict';

module.exports = function (callback) {
  var doc = document;
  if (doc.addEventListener) {
    doc.addEventListener("DOMContentLoaded", callback, false);
  }
  else {
    self.attachEvent("onload", callback);
  }
};
},{}],15:[function(require,module,exports){
'use strict';

var ESCAPE_LOOKUP = {
  '&': '&amp;',
  '>': '&gt;',
  '<': '&lt;',
  '"': '&quot;',
  '\'': '&#x27;'
};

function escape(text) {
  if (text == null) {
    return;
  }

  return ('' + text).replace(/[&><"']/g, function (match) {
    return ESCAPE_LOOKUP[match];
  });
}

module.exports = escape;
},{}],16:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('./tools');

//Global expression list
nj.exprs = {
  'if': function (refer, useUnless) {
    if (refer === 'false') {
      refer = false;
    }

    var referR, ret;
    if (!useUnless) {
      referR = !!refer;
    }
    else {
      referR = !!!refer;
    }
    if (referR) {
      ret = this.result();
    }
    else {
      ret = this.inverse();
    }

    if (this.useString && ret == null) {
      return '';
    }

    return ret;
  },

  unless: function (refer) {
    return nj.exprs['if'].call(this, refer, true);
  },

  each: function (refer) {
    var thiz = this,
      useString = thiz.useString,
      ret;

    if (refer) {
      if (useString) {
        ret = '';
      }
      else {
        ret = [];
      }

      tools.each(refer, function (item, index) {
        var retI = thiz.result({
          loop: true,
          item: item,
          index: index
        });

        if (useString) {
          ret += retI;
        }
        else {
          tools.listPush(ret, retI, true);
        }
      }, false, tools.isArray(refer));

      //Return null when not use string and result is empty.
      if (!useString && !ret.length) {
        ret = null;
      }
    }
    else {
      ret = thiz.inverse();
      if (useString && ret == null) {
        ret = '';
      }
    }

    return ret;
  },

  //Parameter
  param: function () {
    var ret = this.result(),  //Get parameter value
      name = '',
      value;

    //Make property name by multiple parameters
    tools.each(arguments, function (item, i) {
      name += item;
    }, false, true);

    //If the value length greater than 1, it need to be connected to a whole string.
    if (ret != null) {
      if (ret.length > 1) {
        value = '';
        tools.each(ret, function (item) {
          value += item;
        }, false, true);
      }
      else {
        value = ret[0];
      }
    }
    else {  //Match to Similar to "checked" or "disabled" attribute.
      value = name;
    }

    this.paramsExpr[name] = value;
  },

  //Spread parameters
  spreadparam: function (refer) {
    if (!refer) {
      return;
    }

    var thiz = this;
    tools.each(refer, function (v, k) {
      thiz.paramsExpr[k] = v;
    }, false, false);
  },

  equal: function (value1, value2) {
    var ret;
    if (value1 == value2) {
      ret = this.result();
    }
    else {
      ret = this.inverse();
    }

    return ret;
  },

  'for': function (start, end) {
    var ret, useString = this.useString;
    if (useString) {
      ret = '';
    }
    else {
      ret = [];
    }

    if (end == null) {
      end = start;
      start = 0;
    }
    start = parseInt(start, 10);
    end = parseInt(end, 10);

    for (; start <= end; start++) {
      var retI = this.result({
        loop: true,
        item: this.data[0],
        index: start
      });

      if (useString) {
        ret += retI;
      }
      else {
        tools.listPush(ret, retI, true);
      }
    }

    return ret;
  }
};

//Register expression and also can batch add
function registerExpr(name, expr) {
  var params = name;
  if (!tools.isObject(name)) {
    params = {};
    params[name] = expr;
  }

  tools.each(params, function (v, k) {
    nj.exprs[k.toLowerCase()] = v;
  }, false, false);
}

module.exports = {
  registerExpr: registerExpr
};
},{"../core":10,"./tools":22}],17:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('./tools');

//Global filter list
nj.filters = {
  //Get param properties
  prop: function (obj, props) {
    var ret = obj;
    ret && tools.each(props.split('.'), function (p) {
      ret = ret[p];
    }, false, true);

    return ret;
  },

  //Get list count
  count: function (obj) {
    return obj ? obj.length : 0;
  },

  //Get list item
  item: function (obj, no) {
    return obj ? obj[no] : null;
  },

  //Judge equal
  equal: function (obj, val) {
    return obj == val;
  },

  //Less than
  lt: function (val1, val2, noEqual) {
    var ret;
    val1 = parseFloat(val1);
    val2 = parseFloat(val2);

    if (noEqual) {
      ret = val1 < val2;
    }
    else {
      ret = val1 <= val2;
    }

    return ret;
  },

  //Greater than
  gt: function (val1, val2, noEqual) {
    var ret;
    val1 = parseFloat(val1);
    val2 = parseFloat(val2);

    if (noEqual) {
      ret = val1 > val2;
    }
    else {
      ret = val1 >= val2;
    }

    return ret;
  },

  //Addition
  add: function (val1, val2, isFloat) {
    return val1 + (isFloat ? parseFloat(val2) : parseInt(val2, 10));
  },

  //Convert to int 
  int: function (val) {
    return parseInt(val, 10);
  },

  //Convert to float 
  float: function (val) {
    return parseFloat(val);
  },

  //Convert to boolean 
  bool: function (val) {
    if (val === 'false') {
      return false;
    }

    return Boolean(val);
  }
};

//Register filter and also can batch add
function registerFilter(name, filter) {
  var params = name;
  if (!tools.isObject(name)) {
    params = {};
    params[name] = filter;
  }

  tools.each(params, function (v, k) {
    nj.filters[k.toLowerCase()] = v;
  }, false, false);
}

module.exports = {
  registerFilter: registerFilter
};
},{"../core":10,"./tools":22}],18:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('./tools');

//注册组件
function registerComponent(name, component) {
  var params = name;
  if (!tools.isObject(name)) {
    params = {};
    params[name] = component;
  }

  tools.each(params, function (v, k) {
    nj.componentClasses[k.toLowerCase()] = v;
  }, false, false);

  return component;
}

//注册组件标签命名空间
function setNamespace(name) {
  nj.namespace = name;

  //修改标签组件id及类名
  nj.tagId = name + '-id';
  nj.tagStyle = name + '-style';
  nj.tagClassName = name + '-component';
}

//创建标签命名空间
function registerTagNamespace(name) {
  if (!name) {
    name = 'nj';
  }
  nj.tagNamespaces[name] = name;

  if (typeof document === 'undefined') {
    return;
  }

  var doc = document;
  if (doc && doc.namespaces) {
    doc.namespaces.add(name, 'urn:schemas-microsoft-com:vml', '#default#VML');
  }
}

module.exports = {
  registerComponent: registerComponent,
  setNamespace: setNamespace,
  registerTagNamespace: registerTagNamespace
};
},{"../core":10,"./tools":22}],19:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('./tools');

//Set component engine
function setComponentEngine(name, obj, dom, port, render) {
  //Component engine's name
  nj.componentLib = name;

  //Component engine's object
  nj.componentLibObj = obj;

  //Component engine's dom object
  dom = dom || obj;
  nj.componentLibDom = dom;

  //Component engine's create element and render function
  if (name === 'react') {
    port = 'createElement';
    render = 'render';
  }
  nj.componentPort = tools.isString(port) ? obj[port] : port;
  nj.componentRender = tools.isString(render) ? dom[render] : render;
}

module.exports = {
  setComponentEngine: setComponentEngine
};
},{"../core":10,"./tools":22}],20:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  tools = require('./tools');

function _createRegExp(reg, mode) {
  return new RegExp(reg, mode);
}

//Clear the repeated characters
function _clearRepeat(str) {
  var ret = '',
    i = 0,
    l = str.length,
    char;

  for (; i < l; i++) {
    char = str.charAt(i);
    if (ret.indexOf(char) < 0) {
      ret += char;
    }
  }

  return ret;
}

module.exports = function (beginRule, endRule, exprRule) {
  if (!beginRule) {
    beginRule = '{';
  }
  if (!endRule) {
    endRule = '}';
  }
  if (!exprRule) {
    exprRule = '#';
  }

  var allRules = _clearRepeat(beginRule + endRule),
    firstChar = beginRule.charAt(0),
    otherChars = allRules.substr(1),
    exprRules = _clearRepeat(exprRule),
    escapeExprRule = exprRule.replace(/\$/g, '\\$');

  //Reset the regexs to global list
  tools.assign(nj.tmplRule, {
    beginRule: beginRule,
    endRule: endRule,
    exprRule: exprRule,
    xmlOpenTag: _createRegExp('^<([a-z' + firstChar + '][-a-z0-9_:.\/' + otherChars + ']*)[^>]*>$', 'i'),
    openTag: _createRegExp('^[a-z' + firstChar + '][-a-z0-9_:.\/' + otherChars + ']*', 'i'),
    insideBraceParam: _createRegExp(beginRule + '([^' + allRules + ']+)' + endRule, 'i'),
    replaceSplit: _createRegExp('(?:' + beginRule + '){1,2}[^' + allRules + ']+(?:' + endRule + '){1,2}'),
    replaceParam: function() {
      return _createRegExp('((' + beginRule + '){1,2})([^' + allRules + ']+)(' + endRule + '){1,2}', 'g');
    },
    checkElem: function() {
      return _createRegExp('([^>]*)(<([a-z' + firstChar + '\/' + exprRules + '][-a-z0-9_:.' + allRules + exprRules + ']*)[^>]*>)([^<]*)', 'ig');
    },
    expr: _createRegExp('^' + escapeExprRule + '([^\\s]+)', 'i')
  });
};
},{"../core":10,"./tools":22}],21:[function(require,module,exports){
'use strict';

//Converts any value to the parameter of NornJ template can be parsed.
module.exports = function (obj) {
  return {
    _njShim: obj
  };
};
},{}],22:[function(require,module,exports){
'use strict';

var nj = require('../core'),
  assign = require('object-assign'),
  arrayProto = Array.prototype,
  arrayEvery = arrayProto.every,
  arrayForEach = arrayProto.forEach,
  arrayPush = arrayProto.push;

//Push one by one to array
function listPush(arr1, arr2, checkIsArr, checkNotNull) {
  if (checkIsArr && !isArray(arr2)) {
    //Put the value at the end of the first array only when the second parameter is not null.
    if (!checkNotNull || arr2 != null) {
      arr1[arr1.length] = arr2;
    }
    return arr1;
  }

  arrayPush.apply(arr1, arr2);
  return arr1;
}

//判断是否为数组
function isArray(obj) {
  return Array.isArray(obj);
}

//判断是否为对象
function isObject(obj) {
  var type = typeof obj;
  return !isArray(obj) && (type === 'function' || type === 'object' && !!obj);
}

//判断是否为字符串
function isString(obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
}

//获取属性值
function _getProperty(key) {
  return function (obj) {
    return obj == null ? void 0 : obj[key];
  };
}

//是否为类数组
var _getLength = _getProperty('length');
function isArrayLike(obj) {
  var length = _getLength(obj);
  return typeof length == 'number' && length >= 0;
}

//遍历数组或对象
function each(obj, func, context, isArr, useEvery) {
  if (!obj) {
    return;
  }

  var arrayEach;
  if (useEvery) {
    arrayEach = arrayEvery;
  }
  else {
    arrayEach = arrayForEach;
  }
  if (isArr == null) {
    isArr = isArrayLike(obj);
  }

  //设置回调函数上下文
  context = context ? context : obj;

  if (isArr) {
    arrayEach.call(obj, function (o, i) {
      var ret = func.call(context, o, i);

      if (useEvery) {
        if (ret === false) {
          return ret;
        }
        return true;
      }
    });
  }
  else {
    var keys = Object.keys(obj);
    arrayEach.call(keys, function (key) {
      var ret = func.call(context, obj[key], key);

      if (useEvery) {
        if (ret === false) {
          return ret;
        }
        return true;
      }
    });
  }
}

//判断是否在数组内
function inArray(obj, value) {
  return obj.indexOf(value);
}

//去除字符串空格
function trim(str) {
  if (!!!str) {
    return '';
  }

  return str.trim();
}

//抛出异常
function throwIf(val, msg) {
  if (!val) {
    throw Error(msg || val);
  }
}

//create a unique key
function uniqueKey(str) {
  var len = str.length;
  if (len == 0) {
    return str;
  }

  var hash = 0, i, chr;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }

  return hash;
}

//create light weight object
function lightObj() {
  return Object.create(null);
}

//Clear quotation marks
function clearQuot(value) {
  var charF = value.charAt(0),
    regex;

  if (charF === '\'') {
    regex = /[']+/g;
  }
  else if (charF === '"') {
    regex = /["]+/g;
  }
  if (regex) {
    value = value.replace(regex, '');
  }

  return value;
}

//Transform to camel-case
function toCamelCase(str) {
  if (str.indexOf('-') > -1) {
    str = str.replace(/-\w/g, function (letter) {
      return letter.substr(1).toUpperCase();
    });
  }

  return str;
}

var tools = {
  isArray: isArray,
  isArrayLike: isArrayLike,
  isObject: isObject,
  isString: isString,
  each: each,
  inArray: inArray,
  trim: trim,
  throwIf: throwIf,
  assign: assign,
  uniqueKey: uniqueKey,
  lightObj: lightObj,
  listPush: listPush,
  clearQuot: clearQuot,
  toCamelCase: toCamelCase
};

//绑定到nj对象
assign(nj, tools);

module.exports = tools;
},{"../core":10,"object-assign":1}],23:[function(require,module,exports){
'use strict';

var tools = require('./tools'),
  transformElement = require('../transforms/transformElement'),
  transformParam = require('../transforms/transformParam'),
  transformData = require('../transforms/transformData'),
  escape = require('./escape'),
  checkElem = require('../checkElem/checkElem'),
  setComponentEngine = require('./setComponentEngine'),
  registerComponent = require('./registerComponent'),
  filter = require('./filter'),
  expression = require('./expression'),
  setTmplRule = require('./setTmplRule');

//Set default param rule
setTmplRule();

module.exports = tools.assign(
  { 
    escape: escape,
    setTmplRule: setTmplRule
  },
  checkElem,
  setComponentEngine,
  registerComponent,
  filter,
  expression,
  tools,
  transformElement,
  transformParam,
  transformData
);
},{"../checkElem/checkElem":3,"../transforms/transformData":11,"../transforms/transformElement":12,"../transforms/transformParam":13,"./escape":15,"./expression":16,"./filter":17,"./registerComponent":18,"./setComponentEngine":19,"./setTmplRule":20,"./tools":22}]},{},[2]);
var _r = _m(2);_g.nj = _g.NornJ = _r;return _r;})})(typeof window!=='undefined' ? window : (typeof global!=='undefined' ? global : (typeof self!=='undefined' ? self : this)));