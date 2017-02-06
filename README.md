# NornJ
一款轻量级且使用场景丰富的javascript模板引擎。它不仅支持输出普通html字符串，还可以接入`React`或API与`React`类似的view层框架为它们输出虚拟dom，同时还能保证很高的渲染效率。

### 模板基本示例
```html
<template name="partial">
  <input id=test onclick={{click}} />
</template>

<template>
  <div>
    this the test demo Hello {{msg}}
    <#include name="partial" />
  </div>
</template>
```

### 用途
传统js模板引擎如`Handlebars`、`EJS`等通常只支持输出html字符串，`NornJ`与它们相比，相同点和不同点都有：

* 支持`React`作为JSX的替代模板语言；可支持模板预编译，也可以直接在浏览器中运行。
* 支持处理数据并输出html字符串，故它也可以像传统js模板一样支持`Backbone`或`Express`等。
* 它的语法偏向弱逻辑，和`Handlebars`更类似一些，但也有自己独特的地方。

### 与React配合示例
NornJ可以替代JSX输出React组件，用它可以将React组件的逻辑与结构更优雅地实现解藕：
```js
import { Component } from 'react';
import { render } from 'react-dom';
import nj from 'nornj';
import { registerTmpl } from 'nornj-react';

@registerTmpl({
  name: 'TestComponent',
  template: `
    <div id=test1>
      this the test demo{no}.
      <#for {1} {no}>
        <i>test{@index}</i>
      </#for>
    </div>
  `
})
class TestComponent extends Component {
  render() {
    return this.template(this.props);
  }
}

render(nj`<TestComponent no=100 />`(), document.body);

/* output:
<div id="test1">
  this the test demo100.
  <i>test0</i>
  <i>test1</i>
  <i>test2</i>
  ...
  <i>test99</i>
</div>
*/
```

还可以替代ReactDOM.render来在html内渲染React组件：
```html
...
<body>
  <script type="text/nornj" autoRender>
    <TestComponent no="100" />
  </script>
</body>
```

### 在ES5环境下使用
除了使用ES6模板字符串外，NornJ也可以支持在es5环境下使用普通的字符串：
```html
<script id="template" type="text/nornj">
  <div>
    this the test demo Hello {{msg}}
    <input id="test" onclick="{{click}}" />
  </div>
</script>
<script type="text/javascript">
  var tmpl = document.querySelector('#template').innerHTML;
</script>
```
然后可以这样渲染html字符串：
```js
let html = nj.render(tmpl, {
  msg: 'Hello world!',
  click: "alert('test')"
});

console.log(html);
/*输出：
<div>
  this the test demo Hello world!
  <input id='test' onclick="alert('test')" />
</div>
*/
```

### 安装

使用npm安装:

```sh
npm install nornj
```

### 浏览器支持

* 可支持所有现代浏览器以及Internet Explorer 8+。

### 更多详细文档

* [模板语法](https://github.com/joe-sky/nornj/blob/master/docs/模板语法.md)
* [编译模板并输出html字符串](https://github.com/joe-sky/nornj/blob/master/docs/编译模板并输出html字符串.md)
* [编译模板并输出React组件](https://github.com/joe-sky/nornj/blob/master/docs/编译模板并输出React组件.md)
* [在独立模板文件中分模块构建](https://github.com/joe-sky/nornj/blob/master/docs/在独立模板文件中分模块构建.md)
* [在html dom中渲染React组件](https://github.com/joe-sky/nornj/blob/master/docs/在html%20dom中渲染React组件.md)
* [模板全局配置](https://github.com/joe-sky/nornj/blob/master/docs/模板全局配置.md)

### License

MIT
