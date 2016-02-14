(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.NornJ = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var nj = require('./core'),
    utils = require('./utils/utils'),
    setComponentEngine = utils.setComponentEngine,
    compiler = require('./compiler/compile');

nj.setComponentEngine = setComponentEngine;
nj.compile = compiler.compile;
nj.compileComponent = compiler.compileComponent;
nj.compileTagComponent = compiler.compileTagComponent;
nj.renderTagComponent = compiler.renderTagComponent;
nj.registerComponent = utils.registerComponent;
nj.registerFilter = utils.registerFilter;

//创建标签命名空间
utils.createTagNamespace();

//默认使用react作为组件引擎
if (typeof React !== "undefined") {
    setComponentEngine("react", React, typeof ReactDOM !== "undefined" ? ReactDOM : null);
}

var global = typeof self !== "undefined" ? self : this;
module.exports = global.NornJ = global.nj = nj;
},{"./compiler/compile":4,"./core":7,"./utils/utils":13}],2:[function(require,module,exports){
'use strict';

var nj = require('../core'),
    tools = require('../utils/tools'),
    checkTagElem = require('./checkTagElem');

//检测元素节点
function checkElem(obj, parent) {
    var node = {},
        parentContent = !parent.hasElse ? "content" : "contentElse";

    if (!tools.isArray(obj)) {
        if (tools.isString(obj)) {  //判断是否为文本节点
            node.type = "nj_plaintext";
            node.content = [obj];
            parent[parentContent].push(node);
        }

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
        var xmlOpenTag = tools.getXmlOpenTag(first),
            openTagName,
            hasCloseTag = false,
            isTmpl;

        if (xmlOpenTag) {  //tagname为xml标签时,则认为是元素节点
            openTagName = xmlOpenTag[1];

            if (!tools.isXmlSelfCloseTag(first)) {  //非自闭合标签才验证是否存在关闭标签
                hasCloseTag = tools.isXmlCloseTag(last, openTagName);
            }
            else {  //自闭合标签
                node.selfCloseTag = true;
            }
            isElemNode = true;
        }
        else {
            control = tools.isControl(first);
            if (!control) {  //tagname不为xml标签时,必须有结束标签才认为是元素节点
                var openTag = tools.getOpenTag(first);
                if (openTag) {
                    openTagName = openTag[0];

                    if (!tools.isSelfCloseTag(first)) {  //非自闭合标签
                        hasCloseTag = tools.isCloseTag(last, openTagName);
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
                isTmpl = tools.isTmpl(ctrl);

                node.type = "nj_" + ctrl;
                if (refer != null) {
                    node.refer = refer;
                }

                if (tools.isControlCloseTag(last, ctrl)) {  //判断是否有流程控制块闭合标签
                    hasCloseTag = true;
                }
                isElemNode = true;
            }
        }

        if (isElemNode) {  //判断是否为元素节点
            var hasParams = false,
                elseIndex = -1,
                pushContent = true;

            //取出节点参数
            var params = obj[1];
            if (tools.isObject(params)) {  //如果第二个参数为对象,则为节点参数
                if (!control) {  //为元素节点时取各参数
                    node.params = params;
                }
                else {  //为特殊节点时取refer
                    var retR = tools.getControlRefer(params.refer);
                    node.refer = retR ? retR[1] : params.refer;
                }

                hasParams = true;
            }

            if (!control) {
                node.type = openTagName;

                //获取openTag内参数
                var tagParams = tools.getOpenTagParams(first, !xmlOpenTag);
                if (tagParams) {
                    if (!node.params) {
                        node.params = {};
                    }
                
                    tools.each(tagParams, function (param) {
                        node.params[param.key] = param.value;
                    });
                }
            }
            else {  //为流程控制块时判断是否有$else
                if (isTmpl) {  //模板元素
                    pushContent = false;

                    //将模板添加到父节点的params中
                    tools.addTmpl(node, parent);
                }
                else {
                    elseIndex = tools.inArray(obj, "$else");
                }
            }

            //放入父节点content内
            if(pushContent) {
                parent[parentContent].push(node);
            }

            //取出子节点集合
            // TODO 此处需要判断参数外是否包裹有流程控制块
            var end = len - (hasCloseTag ? 1 : 0),
                content = obj.slice(hasParams ? 2 : 1, (elseIndex < 0 ? end : elseIndex));
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
    });
}

module.exports = {
    checkElem: checkElem,
    checkTagElem: checkTagElem
};
},{"../core":7,"../utils/tools":12,"./checkTagElem":3}],3:[function(require,module,exports){
'use strict';

var nj = require('../core'),
    tools = require('../utils/tools');

//检测标签元素节点
function checkTagElem(obj, parent) {
    var node = {},
        nodeType = obj.nodeType,
        nodeValue = tools.trim(obj.nodeValue),
        parentContent = !parent.hasElse ? "content" : "contentElse";

    //处理文本节点
    if (nodeType === 3) {
        if (nodeValue === '') {
            return;
        }

        node.type = "nj_plaintext";
        node.content = [nodeValue];
        parent[parentContent].push(node);

        return;
    }

    //处理元素节点
    if (nodeType === 1) {
        var tagName = tools.getTagComponentName(obj),
            params = tools.getTagComponentAttrs(obj),
            isControl = tools.isTagControl(tagName),
            pushContent = true,
            isTmpl;

        if (isControl) {  //特殊节点
            if(tagName !== "else") {
                node.type = "nj_" + tagName;

                isTmpl = tools.isTmpl(tagName);
                if (isTmpl) {  //模板元素
                    pushContent = false;
                
                    //将模板添加到父节点的params中
                    tools.addTmpl(node, parent);
                }
                else {  //流程控制块
                    var retR = tools.getControlRefer(params.refer);
                    node.refer = retR ? retR[1] : params.refer;
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
            if (params) {
                node.params = params;
            }
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
    });
}

module.exports = checkTagElem;
},{"../core":7,"../utils/tools":12}],4:[function(require,module,exports){
'use strict';

var nj = require('../core'),
    utils = require('../utils/utils'),
    tranString = require('./transformToString'),
    tranComponent = require('./transformToComponent');

//编译字面量并返回转换函数
function compile(obj, tmplName, isComponent, isTag) {
    if (!obj) {
        return;
    }

    var root;
    if (tmplName) {
        root = nj.templates[tmplName];
    }
    if (!root) {
        if (utils.isObject(obj)) {  //If obj is Object,we think obj is a precompiled template.
            root = obj;
        }
        else {
            root = {
                type: "nj_root",
                content: []
            };

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

    return function (data) {
        if (!data) {
            data = {};
        }

        return !isComponent
            ? tranString.transformContentToString(root.content, data)     //转换字符串
            : tranComponent.transformToComponent(root.content[0], data);  //转换组件
    };
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
function renderTagComponent(data, el) {
    var tags = utils.getTagComponents(el),
        ret = [];

    utils.each(tags, function (tag) {
        var tmpl = compileTagComponent(tag, tag.getAttribute(nj.tagId));
        ret.push(nj.componentLibDom[nj.componentRender](tmpl(data), tag.parentNode));
    });

    return ret;
}

module.exports = {
    compile: compile,
    compileComponent: compileComponent,
    compileTagComponent: compileTagComponent,
    renderTagComponent: renderTagComponent
};
},{"../core":7,"../utils/utils":13,"./transformToComponent":5,"./transformToString":6}],5:[function(require,module,exports){
'use strict';

var nj = require('../core'),
    utils = require('../utils/utils');

//转换节点为组件节点
function transformToComponent(obj, data, parent) {
    var ret = null,
        controlRefer = obj.refer;

    if (obj.type === "nj_plaintext") {
        //替换插入在文本中的参数
        ret = utils.replaceParams(obj.content[0], data, true, null, parent);

        //执行模板数据
        if (utils.isObject(ret) && ret.type === "nj_tmpl") {
            ret = transformContentToComponent(ret.content, data, parent);
        }
    }
    else if (controlRefer != null) {  //流程控制块
        var dataRefer = utils.getDataValue(data, controlRefer, parent);

        switch (obj.type) {
            case "nj_if":
                ret = transformContentToComponent(!!dataRefer ? obj.content : obj.contentElse, data, parent);
                break;
            case "nj_each":
                if (dataRefer && dataRefer.length) {
                    ret = [];
                    utils.each(dataRefer, function (item) {
                        var _parent = {  //Create a parent data object
                            data: item,
                            parent: parent
                        };
                        ret.push(transformContentToComponent(obj.content, utils.getItemParam(item, data), _parent));
                    });
                }
                else if (obj.hasElse) {
                    ret = transformContentToComponent(obj.contentElse, data, parent);
                }
                break;
        }
    }
    else {
        //如果有相应组件,则使用组件类作为type值
        var componentClass = nj.componentClasses[obj.type.toLowerCase()],
            type = componentClass ? componentClass : obj.type;

        //调用创建组件接口,必须需要用apply以多个参数的形式传参,否则在react中,元素放在数组里时会报需要加key属性的警告
        ret = nj.componentLibObj[nj.componentPort].apply(nj.componentLibObj,
            [type,                                                 //组件名
            utils.transformParamsToObj(obj.params, data, parent)].concat(  //参数
            transformContentToComponent(obj.content, data, parent)));      //子组件
    }

    return ret;
}

//转换子节点为组件节点
function transformContentToComponent(content, data, parent) {
    if (!content) {
        return null;
    }
    if (!parent && data) {  //Init a parent data object and cascade pass on the children node
        parent = {
            data: utils.isArray(data) ? data[0] : data
        };
    }

    var ret = [];
    utils.each(content, function (obj) {
        ret.push(transformToComponent(obj, data, parent));
    });

    return ret.length === 1 ? ret[0] : ret;
}

module.exports = {
    transformToComponent: transformToComponent,
    transformContentToComponent: transformContentToComponent
};
},{"../core":7,"../utils/utils":13}],6:[function(require,module,exports){
'use strict';

var utils = require('../utils/utils');

//转换节点为字符串
function transformToString(obj, data, parent) {
    var ret = "",
        controlRefer = obj.refer;

    if (obj.type === "nj_plaintext") {
        //替换插入在文本中的参数
        ret = utils.replaceParams(obj.content[0], data, null, null, parent);
    }
    else if (controlRefer != null) {  //流程控制块
        var dataRefer = utils.getDataValue(data, controlRefer, parent);

        switch (obj.type) {
            case "nj_if":
                ret = transformContentToString(!!dataRefer ? obj.content : obj.contentElse, data, parent);
                break;
            case "nj_each":
                if (dataRefer && dataRefer.length) {
                    utils.each(dataRefer, function (item) {
                        var _parent = {  //Create a parent data object
                            data: item,
                            parent: parent
                        };
                        ret += transformContentToString(obj.content, utils.getItemParam(item, data), _parent);
                    });
                }
                else if (obj.hasElse) {
                    ret = transformContentToString(obj.contentElse, data, parent);
                }
                break;
        }
    }
    else {
        var openTag = "<" + obj.type + utils.transformParams(obj.params, data, parent);
        if (!obj.selfCloseTag) {
            ret = openTag + ">" + transformContentToString(obj.content, data, parent) + "</" + obj.type + ">";
        }
        else {  //自闭合标签
            ret = openTag + "/>";
        }
    }

    return ret;
}

//转换子节点为字符串
function transformContentToString(content, data, parent) {
    var ret = "";
    if (!content) {
        return ret;
    }
    if(!parent && data) {  //Init a parent data object and cascade pass on the children node
        parent = {
            data: utils.isArray(data) ? data[0] : data
        };
    }

    utils.each(content, function (obj) {
        ret += transformToString(obj, data, parent);
    });

    return ret;
}

module.exports = {
    transformToString: transformToString,
    transformContentToString: transformContentToString
};
},{"../utils/utils":13}],7:[function(require,module,exports){
'use strict';

var nj = {
    componentLib: null,
    componentLibObj: null,
    componentLibDom: null,
    componentPort: null,
    componentRender: null,
    componentClasses: {},
    tagNamespace: "nj",
    tagId: "nj-id",
    tagStyle: "nj-style",
    tagClassName: "nj-component",
    templates: {}
};

module.exports = nj;
},{}],8:[function(require,module,exports){
'use strict';

var ESCAPE_LOOKUP = {
    '&': '&amp;',
    '>': '&gt;',
    '<': '&lt;',
    '"': '&quot;',
    '\'': '&#x27;'
},
ESCAPE_REGEX = /[&><"']/g;

function escape(text) {
    return ('' + text).replace(ESCAPE_REGEX, function(match) {
        return ESCAPE_LOOKUP[match];
    });
}

module.exports = escape;
},{}],9:[function(require,module,exports){
'use strict';

var nj = require('../core'),
    tools = require('./tools');

//过滤器对象
nj.filters = {};

//注册过滤器
function registerFilter(name, filter) {
    var params = name;
    if (!tools.isArray(name)) {
        params = [{ name: name, filter: filter }];
    }

    tools.each(params, function (param) {
        nj.filters[param.name.toLowerCase()] = param.filter;
    });
}

var filter = {
    registerFilter: registerFilter
};

module.exports = filter;
},{"../core":7,"./tools":12}],10:[function(require,module,exports){
'use strict';

var nj = require('../core'),
    tools = require('./tools');

//注册组件
function registerComponent(name, obj) {
    var params = name;
    if (!tools.isArray(name)) {
        params = [{ name: name, obj: obj }];
    }

    tools.each(params, function (param) {
        nj.componentClasses[param.name.toLowerCase()] = param.obj;
    });
}

//注册组件标签命名空间
function registerTagNamespace(name) {
    nj.tagNamespace = name;
    createTagNamespace();

    //修改标签组件id及类名
    nj.tagId = name + "-id";
    nj.tagStyle = name + "-style";
    nj.tagClassName = name + "-component";
}

//创建标签命名空间
function createTagNamespace() {
    if (typeof document === "undefined") {
        return;
    }

    var doc = document;
    if (doc && doc.namespaces) {
        doc.namespaces.add(nj.tagNamespace, 'urn:schemas-microsoft-com:vml', "#default#VML");
    }
}

module.exports = {
    registerComponent: registerComponent,
    registerTagNamespace: registerTagNamespace,
    createTagNamespace: createTagNamespace
};
},{"../core":7,"./tools":12}],11:[function(require,module,exports){
'use strict';

var nj = require('../core');

//设置组件引擎
function setComponentEngine(name, obj, dom, port, render) {
    nj.componentLib = name;
    nj.componentLibObj = obj;
    nj.componentLibDom = dom || obj;
    if (name === "react") {
        port = "createElement";
        render = "render";
    }
    nj.componentPort = port;
    nj.componentRender = render;
}

module.exports = setComponentEngine;
},{"../core":7}],12:[function(require,module,exports){
'use strict';

var nj = require('../core'),
    escape = require('./escape'),
    arrayEvery = Array.prototype.every;

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
function getProperty(key) {
    return function (obj) {
        return obj == null ? void 0 : obj[key];
    };
}

//是否为类数组
var getLength = getProperty('length');
function isArrayLike(obj) {
    var length = getLength(obj);
    return typeof length == 'number' && length >= 0;
}

//遍历数组或对象
function each(obj, func, context) {
    if (!obj) {
        return;
    }

    //设置回调函数上下文
    context = context ? context : obj;

    if (isArrayLike(obj)) {
        arrayEvery.call(obj, function (o, i, arr) {
            var ret = func.call(context, o, i, arr);

            if (ret === false) {
                return ret;
            }
            return true;
        });
    }
    else {
        var keys = Object.keys(obj);
        arrayEvery.call(keys, function (o, i) {
            var key = keys[i],
                ret = func.call(context, obj[key], key, obj);

            if (ret === false) {
                return ret;
            }
            return true;
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

//转换节点参数为字符串
function transformParams(obj, data, parent) {
    var ret = "";
    each(obj, function (v, k) {
        ret += " " + k + "='" + replaceParams(v, data, null, null, parent) + "'";
    });

    return ret;
}

//转换节点参数为对象
function transformParamsToObj(obj, data, parent) {
    var ret = obj ? {} : null;
    each(obj, function (v, k) {
        replaceParams(v, data, ret, k, parent);
    });

    return ret;
}

//设置对象参数
function setObjParam(obj, key, value, notTran) {
    var style;
    if (!notTran && nj.componentLib === "react") {
        switch (key) {
            case "class":
                key = "className";
                break;
            case "for":
                key = "htmlFor";
                break;
            case "style":
            case nj.tagStyle:
                key = "style";
                style = getStyleParams(value);
                break;
        }
    }

    obj[key] = style != null ? style : value;
}

//Use filters
function _useFilters(filters, ret) {
    if (filters) {
        var filtersObj = nj.filters;
        each(filters, function (k) {
            var filter = filtersObj[k.toLowerCase()];
            if (filter) {
                ret = filter(ret);
            }
        });
    }

    return ret;
}

//获取data值
function getDataValue(data, prop, parent) {
    if (data == null) {
        return;
    }

    var isArr = isArray(data),
        filters;
    if (prop.indexOf(":") >= 0) {  //prop中有分隔线时使用过滤器
        filters = prop.split(":");
        prop = filters[0];
        filters = filters.slice(1);
    }
    if (prop === ".") {  //prop为点号时直接使用data作为返回值
        return _useFilters(filters, isArr ? data[0] : data);
    }

    var list, ret,
        filtersObj = nj.filters;

    if (parent && prop.indexOf("../") > -1) {  //According to the param path to get data
        prop = prop.replace(/\.\.\//g, function () {
            var _parent = parent.parent;
            throwIf(_parent, "Parent data is undefined, please check the param path declare.");
            parent = _parent;
            list = [parent.data];
            return "";
        });
    }
    else if (isArr) {  //The data param is array
        list = data;
    }
    else {
        list = [data];
    }

    each(list, function (obj) {
        if (obj) {
            ret = obj[prop];

            //Use filters
            ret = _useFilters(filters, ret);

            if (ret != null) {
                return false;
            }
        }
    });

    return ret;
}

//获取each块中的item参数
function getItemParam(item, data) {
    var ret = item;
    if (isArray(data)) {
        ret = [item].concat(data.slice(1));
    }

    return ret;
}

//替换参数字符串
function replaceParams(value, data, newObj, newKey, parent) {
    var params = getReplaceParam(value),
        useObj = isObject(newObj),  //newObj的值可能为对象或布尔值,此处判断是否为对象
        isAll;

    if (params) {
        each(params, function (param) {
            var placeholder = param[0],
                prop = param[2],
                dataProp = getDataValue(data, prop, parent),
                isAll = placeholder === value;

            //参数为字符串时,须做特殊字符转义
            if (dataProp
                && !newObj                  //Only in transform to string need escape
                && param[1].length < 2) {   //Only in the opening brace's length less than 2 need escape
                dataProp = escape(dataProp);
            }

            //如果参数只存在占位符,则可传引用参数
            if (isAll) {
                if (useObj) {  //在新对象上创建属性
                    setObjParam(newObj, newKey, dataProp);
                }

                value = dataProp;
            }
            else {  //逐个替换占位符
                value = value.replace(new RegExp(placeholder, "ig"), dataProp);
            }
        });
    }

    //存在多个占位符的情况
    if (useObj && !isAll) {
        setObjParam(newObj, newKey, value);
    }

    return value;
}

//提取替换参数
function getReplaceParam(obj) {
    var pattern = /({{1,2})([^"'\s{}]+)}{1,2}/g,
        matchArr,
        ret;

    while ((matchArr = pattern.exec(obj))) {
        if (!ret) {
            ret = [];
        }
        ret.push(matchArr);
    }

    return ret;
}

//提取xml open tag
function getXmlOpenTag(obj) {
    return /^<([a-z][-a-z0-9_:.]*)[^>]*>$/i.exec(obj);
}

//验证xml self close tag
function isXmlSelfCloseTag(obj) {
    return /^<[^>]+\/>$/i.test(obj);
}

//提取xml open tag内参数
function getOpenTagParams(obj, noXml) {
    var pattern = /([^\s=]+)=((['"][^"']+['"])|(['"]?[^"'\s]+['"]?))/g,  //如果属性值中有空格,则必须加引号
        matchArr,
        ret;

    while ((matchArr = pattern.exec(obj))) {
        if (!ret) {
            ret = [];
        }

        var key = matchArr[1],
            value = matchArr[2].replace(/['"]+/g, ""),  //去除引号
            len = value.length;

        //去除末尾的"/>"或">"
        if (!noXml) {
            if (value.lastIndexOf("/>") === len - 2) {
                value = value.replace(/\/>/, "");
            }
            else if (value.lastIndexOf(">") === len - 1) {
                value = value.replace(/>/, "");
            }
        }
        ret.push({ key: key, value: value });
    }

    return ret;
}

//判断xml close tag
function isXmlCloseTag(obj, tagName) {
    return isString(obj) && obj.toLowerCase() === "</" + tagName + ">";
}

//提取open tag
function getOpenTag(obj) {
    return /^[a-z][-a-z0-9_:.]*/i.exec(obj);
}

//验证self close tag
function isSelfCloseTag(obj) {
    return /\/$/i.test(obj);
}

//判断close tag
function isCloseTag(obj, tagName) {
    return isString(obj) && obj.toLowerCase() === "/" + tagName.toLowerCase();
}

//提取流程控制块refer值
function getControlRefer(obj) {
    return /{([^"'\s{}]+)}/i.exec(obj);
}

//判断流程控制块并返回refer值
function isControl(obj) {
    var ret, ret1 = /^\$(if|each|tmpl)/i.exec(obj);
    if (ret1) {
        ret = [ret1[1]];

        var ret2 = getControlRefer(obj);  //提取refer值
        if (ret2) {
            ret.push(ret2[1]);
        }
    }

    return ret;
}

//判断流程控制块close tag
function isControlCloseTag(obj, tagName) {
    return isString(obj) && obj === "/$" + tagName;
}

//判断是否模板元素
function isTmpl(obj) {
    return obj === "tmpl";
}

//加入到模板集合中
function addTmpl(node, parent) {
    var paramsP = parent.params;
    if (!paramsP) {
        paramsP = parent.params = {};
    }

    var tmpls = paramsP.tmpls;
    if (!paramsP.tmpls) {
        tmpls = paramsP.tmpls = [];
    }

    tmpls.push(node);
}

//获取标签组件名
function getTagComponentName(el) {
    var namespace = nj.tagNamespace,
        tagName = el.tagName.toLowerCase();

    if (tagName.indexOf(namespace + ":") === 0) {
        tagName = tagName.split(":")[1];
    }

    return tagName;
}

//提取style内参数
function getStyleParams(obj) {
    //参数为字符串
    var pattern = /([^\s:]+)[\s]?:[\s]?([^\s;]+)[;]?/g,
        matchArr,
        ret;

    while ((matchArr = pattern.exec(obj))) {
        var key = matchArr[1].toLowerCase(),
            value = matchArr[2];

        if (!ret) {
            ret = {};
        }

        //将连字符转为驼峰命名
        if (key.indexOf("-") > -1) {
            key = key.replace(/-\w/g, function (letter) {
                return letter.substr(1).toUpperCase();
            });
        }

        ret[key] = value;
    }

    return ret;
}

//获取标签组件所有属性
function getTagComponentAttrs(el) {
    var attrs = el.attributes,
        ret;

    each(attrs, function (obj) {
        var attrName = obj.nodeName;
        if (attrName !== nj.tagId && obj.specified) {  //此处如不判断specified属性,则低版本IE中会列出所有可能的属性
            var val = obj.nodeValue;
            if (!ret) {
                ret = {};
            }

            if (attrName === "style") {  //style属性使用cssText
                val = el.style.cssText;
            }
            else if (attrName.indexOf("on") === 0) {  //以on开头的属性统一转换为驼峰命名
                attrName = attrName.replace(/on\w/, function (letter) {
                    return "on" + letter.substr(2).toUpperCase();
                });
            }

            setObjParam(ret, attrName, val, true);
        }
    });

    return ret;
}

//判断标签流程控制块
function isTagControl(obj) {
    return /^(if|each|else|tmpl)$/i.test(obj);
}

//获取全部标签组件
function getTagComponents(el) {
    if (!el) {
        el = document;
    }

    return el.querySelectorAll("." + nj.tagClassName);
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
    replaceParams: replaceParams,
    transformParams: transformParams,
    transformParamsToObj: transformParamsToObj,
    getXmlOpenTag: getXmlOpenTag,
    isXmlCloseTag: isXmlCloseTag,
    getOpenTag: getOpenTag,
    isCloseTag: isCloseTag,
    getOpenTagParams: getOpenTagParams,
    isXmlSelfCloseTag: isXmlSelfCloseTag,
    isSelfCloseTag: isSelfCloseTag,
    getControlRefer: getControlRefer,
    isControl: isControl,
    isControlCloseTag: isControlCloseTag,
    getTagComponentName: getTagComponentName,
    getTagComponentAttrs: getTagComponentAttrs,
    isTagControl: isTagControl,
    getTagComponents: getTagComponents,
    getDataValue: getDataValue,
    getItemParam: getItemParam,
    isTmpl: isTmpl,
    addTmpl: addTmpl
};

//部分函数绑定到nj对象
nj.isArray = isArray;
nj.isArrayLike = isArrayLike;
nj.isObject = isObject;
nj.isString = isString;
nj.each = each;
nj.inArray = inArray;
nj.trim = trim;

module.exports = tools;
},{"../core":7,"./escape":8}],13:[function(require,module,exports){
'use strict';

var checkElem = require('../checkElem/checkElem'),
    tools = require('./tools'),
    registerComponent = require('./registerComponent'),
    filter = require('./filter');

var utils = {
    checkElem: checkElem.checkElem,
    checkTagElem: checkElem.checkTagElem,
    setComponentEngine: require('./setComponentEngine'),
    registerComponent: registerComponent.registerComponent,
    registerTagNamespace: registerComponent.registerTagNamespace,
    createTagNamespace: registerComponent.createTagNamespace,
    registerFilter: filter.registerFilter
};

for (var k in tools) {
    utils[k] = tools[k];
}

module.exports = utils;
},{"../checkElem/checkElem":2,"./filter":9,"./registerComponent":10,"./setComponentEngine":11,"./tools":12}]},{},[1])(1)
});