﻿'use strict';

var nj = require('../src/base'),
  fs = require('fs'),
  path = require('path'),
  tmplRule = nj.tmplRule;

function getIncludeTmpl(tmplString, fileName, isAll, tmplStrs, tmplName) {
  //解析template块
  if (!tmplStrs) {
    tmplStrs = {};
    var templateRule = tmplRule.template.replace(/\$/g, '\\$'),
      pattern = new RegExp('<' + templateRule + '([^>]*)>([\\s\\S]*?)</' + templateRule + '>', 'ig'),
      matchArr, hasTemplate;

    while (matchArr = pattern.exec(tmplString)) {
      var props = nj.getOpenTagParams(matchArr[1]),
        name = 'main';

      props && props.forEach(function (prop) {
        if (prop.key === 'name') {
          name = prop.value;
        }
      });

      tmplStrs[name] = matchArr[2];
      hasTemplate = true;
    }

    if (!hasTemplate) {
      tmplStrs.main = tmplString;
    }
  }

  var tmplStrList = [],
    ret;
  if (!isAll) {
    var tName = tmplName == null ? 'main' : tmplName;
    tmplStrList.push({ name: tName, tmpl: tmplStrs[tName] });
  }
  else {  //按各子模板生成对象结构
    Object.keys(tmplStrs).forEach(function (tName) {
      tmplStrList.push({ name: tName, tmpl: tmplStrs[tName] });
    });

    ret = {};
  }

  tmplStrList.forEach(function (obj) {
    //解析include块
    var _ret = obj.tmpl.replace(tmplRule.include(), function (all, params) {
      var props = nj.getOpenTagParams(params),
        src, name;

      props.forEach(function (prop) {
        switch (prop.key) {
          case 'src':
            src = prop.value;
            break;
          case 'name':
            name = prop.value;
            break;
        }
      });

      if (src != null) {  //读取其他文件中的模板
        var basePath = path.dirname(fileName),
          targetFileName = path.resolve(basePath, src),
          targetTmplString = fs.readFileSync(targetFileName, 'utf-8');

        return getIncludeTmpl(targetTmplString, targetFileName, false, null, name);
      }
      else {  //读取当前文件中的模板
        return getIncludeTmpl(null, fileName, false, tmplStrs, name);
      }
    });

    if (!isAll) {
      ret = _ret;
    }
    else {
      ret[obj.name] = _ret;
    }
  });

  return ret;
}

module.exports = getIncludeTmpl;