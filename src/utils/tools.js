﻿'use strict';

var nj = require('../core'),
  assign = require('object-assign'),
  arrayProto = Array.prototype,
  arrayEvery = arrayProto.every,
  arrayForEach = arrayProto.forEach,
  arrayPush = arrayProto.push;

//Array push
function listPush(arr1, arr2) {
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
    arrayEach.call(obj, function (o, i, arr) {
      var ret = func.call(context, o, i, arr);

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
    arrayEach.call(keys, function (o, i) {
      var key = keys[i],
        ret = func.call(context, obj[key], key, obj);

      if (useEvery) {
        if (ret === false) {
          return ret;
        }
        return true;
      }
    });
  }
}

//Transform multidimensional array to one-dimensional array
function flatten(obj) {
  var output = [],
    idx = 0;

  if (isArray(obj)) {
    for (var i = 0, l = _getLength(obj) ; i < l; i++) {
      var value = obj[i];
      //flatten current level of array or arguments object
      value = flatten(value);

      var j = 0, len = value.length;
      output.length += len;
      while (j < len) {
        output[idx++] = value[j++];
      }
    }
  }
  else {
    output[idx++] = obj;
  }

  return output;
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
  flatten: flatten,
  clearQuot: clearQuot
};

//绑定到nj对象
assign(nj, tools);

module.exports = tools;