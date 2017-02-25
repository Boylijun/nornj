﻿import nj from '../core';
import * as tools from '../utils/tools';
import * as tranParam from '../transforms/transformParam';
import * as tranElem from '../transforms/transformElement';
const { tmplRule } = nj;
const NO_SPLIT_NEWLINE = [
  'style',
  'script',
  'textarea',
  'pre',
  'xmp',
  'template'
];

function _plainTextNode(obj, parent, parentContent, noSplitNewline) {
  const node = {};
  node.type = 'nj_plaintext';
  node.content = [tranParam.compiledParam(obj)];
  node.allowNewline = noSplitNewline;
  parent[parentContent].push(node);
}

//检测元素节点
export default function checkElem(obj, parent, hasExProps, noSplitNewline, isLast) {
  const parentContent = 'content';

  if (!tools.isArray(obj)) { //判断是否为文本节点
    if (tools.isString(obj)) {
      if (!noSplitNewline) {
        let strs = obj.split(tmplRule.newlineSplit);
        strs.forEach((str, i) => {
          str = str.trim();
          str !== '' && _plainTextNode(str, parent, parentContent, noSplitNewline);
        });
      } else {
        _plainTextNode(isLast && parent.allowNewline === 'nlElem' ? tools.trimRight(obj) : obj, parent, parentContent, noSplitNewline);
      }
    } else {
      _plainTextNode(obj, parent, parentContent, noSplitNewline);
    }

    return;
  }

  const node = {},
    first = obj[0];
  if (tools.isString(first)) { //第一个子节点为字符串
    let len = obj.length,
      last = obj[len - 1],
      isElemNode = false,
      expr,
      exprParams;

    //判断是否为xml标签
    let openTagName,
      hasCloseTag = false,
      isTmpl,
      isParamsExpr,
      isProp,
      isExProp,
      needAddToProps;

    expr = tranElem.isExpr(first);
    if (!expr) {
      const xmlOpenTag = tranElem.getXmlOpenTag(first);
      if (xmlOpenTag) { //tagname为xml标签时,则认为是元素节点
        openTagName = xmlOpenTag[1];

        if (!tranElem.isXmlSelfCloseTag(first)) { //非自闭合标签才验证是否存在关闭标签
          hasCloseTag = tranElem.isXmlCloseTag(last, openTagName);
        } else { //自闭合标签
          node.selfCloseTag = true;
        }
        isElemNode = true;
      }
    } else { //为块表达式,也可视为一个元素节点
      const exprName = expr[0];
      exprParams = expr[1];
      isTmpl = tranElem.isTmpl(exprName);
      isParamsExpr = tranElem.isParamsExpr(exprName);
      if (!isParamsExpr) {
        let exProp = tranElem.isExProp(exprName);
        isProp = exProp.isProp;
        isExProp = exProp.isExProp;
        needAddToProps = isProp ? !hasExProps : isExProp;
      }

      node.type = 'nj_expr';
      node.expr = exprName;
      if (exprParams != null && !isTmpl && !isParamsExpr) {
        if (!node.args) {
          node.args = [];
        }

        tools.each(exprParams, (param) => {
          if (param.value === 'useString') {
            node.useString = true;
            return;
          }

          let paramV = tranParam.compiledParam(param.value);
          if (param.onlyBrace) { //提取匿名参数
            node.args.push(paramV);
          } else {
            if (!node.params) {
              node.params = tools.obj();
            }
            node.params[param.key] = paramV;
          }
        }, false, true);
      }

      isElemNode = true;
    }

    if (isElemNode) { //判断是否为元素节点
      let pushContent = true;
      if (noSplitNewline) {
        node.allowNewline = true;
      }

      if (!expr) {
        node.type = openTagName;

        //If open tag has a brace,add the typeRefer param.
        const typeRefer = tranElem.getInsideBraceParam(openTagName);
        if (typeRefer) {
          node.typeRefer = tranParam.compiledParam(typeRefer[0]);
        }

        //获取openTag内参数
        const tagParams = tranElem.getOpenTagParams(first);
        if (tagParams) {
          if (!node.params) {
            node.params = tools.obj();
          }

          tools.each(tagParams, (param) => { //The parameter like "{prop}" needs to be replaced.
            node.params[param.onlyBrace ? param.onlyBrace.replace(/\.\.\//g, '') : param.key] = tranParam.compiledParam(param.value);
          }, false, true);
        }

        //Verify if self closing tag again, because the tag may be similar to "<br></br>".
        if (!node.selfCloseTag) {
          node.selfCloseTag = tranElem.verifySelfCloseTag(openTagName);
        }

        if (noSplitNewline == null && NO_SPLIT_NEWLINE.indexOf(openTagName.toLowerCase()) > -1) {
          noSplitNewline = true;
          node.allowNewline = 'nlElem';
        }
      } else {
        if (isTmpl) { //模板元素
          pushContent = false;

          //将模板添加到父节点的params中
          tranElem.addTmpl(node, parent, exprParams ? exprParams[0].value : null);
        } else if (isParamsExpr) {
          pushContent = false;
        } else if (needAddToProps) {
          pushContent = false;
        }

        if (noSplitNewline == null && node.expr === 'pre') {
          noSplitNewline = true;
          node.allowNewline = 'nlElem';
        }
      }

      //放入父节点content内
      if (pushContent) {
        parent[parentContent].push(node);
      }

      //取出子节点集合
      const end = len - (hasCloseTag ? 1 : 0),
        content = obj.slice(1, end);
      if (content && content.length) {
        checkContentElem(content, node, isParamsExpr || (hasExProps && !isProp), noSplitNewline);
      }

      //If this is params block, set on the "paramsExpr" property of the parent node.
      if (isParamsExpr || needAddToProps) {
        tranElem.addParamsExpr(node, parent, isExProp);
      }
    } else { //如果不是元素节点,则为节点集合
      checkContentElem(obj, parent, hasExProps, noSplitNewline);
    }
  } else if (tools.isArray(first)) { //如果第一个子节点为数组,则该节点一定为节点集合(可以是多层数组嵌套的集合)
    checkContentElem(obj, parent, hasExProps, noSplitNewline);
  }
}

//检测子元素节点
function checkContentElem(obj, parent, hasExProps, noSplitNewline) {
  if (!parent.content) {
    parent.content = [];
  }

  tools.each(obj, (item, i, l) => {
    checkElem(item, parent, hasExProps, noSplitNewline, i == l - 1);
  }, false, true);
}