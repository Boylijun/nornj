﻿var nj = require("../src/base"),
    utils = require("../src/utils/utils"),
    compile = require("../src/compiler/compile").compile;

describe('test compile', function () {
  beforeAll(function () {
    nj.registerFilter("filter1", function (v) {
      return v * 2;
    });
    nj.registerFilter("filter2", function (v) {
      //console.log(this.data);
      return v + 5;
    });
    nj.registerFilter("filter3", function (v) {
      //console.log(this.index);
      return !!!v;
    });
  });

  describe('compile template to html', function () {
    xit('test compile 1', function () {
      var data = {
        name: "joe_sky",
        id: "joe",
        test0: true
      };

      var tmpl =
      ["<div name1=../111>", { name: "my name:{name},id:{id},name:{name}", id: "test1" },
        ["<span>", "sky:{name},{id}"],
        ["span1", "joe", "/span1"],
        ["div id=555", [
          ["<a />"],
          ["input type=button /"],
          ['$if key={test0}',
              ['input id="test5" /']
          ]
        ], "/div"]
      ];

      var tmplFn = compile(tmpl),
          html = tmplFn(data);

      console.log(html);
      expect(html).toBeTruthy();
    });

    xit('test compile 2', function () {
      var data = {
        name: "joe_sky<input>",
        id: "joe",
        id2: 555,
        key: true,
        key2: [1, 2, 3],
        key3: [
            { id: 1 }, { id: 2 }, { id: 3 }
        ],
        key4: [1, 2, 3, 5],
        key6: [{ k: [1, 2] }, { k: [11, 12] }, { k: [21, 22] }],
        divx: "testdiv<div>",
        names: {
          name: "I am joe_sky<b>.",
          my: {
            name: "I am joe_sky<i>.",
            name2: "I am joe_sky<p>."
          }
        }
      };

      var tmplSon =
      ["$each {key4}",
        ['<h1>', { ids: 'hello world333 !!!!!___{../id2:filter1}' },
          'test{{{../name}}}___',
          [
            "aaa{.:filter1(1,2,3):filter2}",
            "bbb{#}",
            "ccc",
            ['$each {../key3}',
              ['$each {../../key2}', 'ddd{.}']
            ]
          ]
        ],
      "$else",
        "aaaaa!! {name}"
      ];

      var tmpl =
      ['<div>', { id: 1, name: 'test1{key5}2', fn: "fn" },
        ['<h1 name=test10>', { id: 'testH1' },
          'hello world1',
          ['<div>', { id: 'test2' }],
          ['{divx} name={{names:prop(my.name2)}}', '/{divx}'],
          ['img/'],
          ['input id="test5" /'],
        '</h1>'],
        ['h2',
          ['hello world2{key3:count},{key4:item(3)}',
          ['<div>', 'test3']],
          ['$each {key6}',
            ['$each {k}',
                '{.}'
            ]
          ],
        '/h2'],
        ["$if {key:filter3}",
          ['<h3>', 'hello world3 !!!'],
        "$else",
          tmplSon
        ],
      '</div>'];

      var tmplFn = compile(tmpl, "tmpl2"),
          html = tmplFn(data);

      console.log(html);
      //expect(html).toBe("<div id='1' name='test1' fn='fn'><h1 id='testH1' name='test10'>hello world1<div id='test2'></div><testdiv&lt;div&gt; name='joe_sky<input>'></testdiv&lt;div&gt;><img/><input id='test5'/></h1><h2>hello world2<div>test3</div></h2><h1 ids='hello world333 !!!!!___1110'>test{joe_sky<input>}___aaa7bbb0cccddd1ddd2ddd3ddd1ddd2ddd3ddd1ddd2ddd3</h1><h1 ids='hello world333 !!!!!___1110'>test{joe_sky<input>}___aaa9bbb1cccddd1ddd2ddd3ddd1ddd2ddd3ddd1ddd2ddd3</h1><h1 ids='hello world333 !!!!!___1110'>test{joe_sky<input>}___aaa11bbb2cccddd1ddd2ddd3ddd1ddd2ddd3ddd1ddd2ddd3</h1></div>");
      expect(html).toBeTruthy();
    });
  });

  describe('compile precompiled template', function () {
    xit('test precompiled 1', function () {
      var data = {
        name: "joe_sky",
        id: "joe",
        test0: true
      };

      var preTmpl = {
        "type": "nj_root",
        "content": [
          {
            "params": { "name": "my name:{name},id:{id},name:{name}", "id": "test1", "name1": "../111" },
            "type": "div",
            "content": [
              {
                "type": "span",
                "content": [
                  {
                    "type": "nj_plaintext",
                    "content": ["sky:{name},{id}"]
                  }
                ]
              }, {
                "type": "span1",
                "content": [
                  {
                    "type": "nj_plaintext",
                    "content": ["joe"]
                  }
                ]
              }, {
                "type": "div",
                "params": { "id": "555" },
                "content": [
                  {
                    "selfCloseTag": true,
                    "type": "a"
                  }, {
                    "selfCloseTag": true,
                    "type": "input",
                    "params": { "type": "button" }
                  }, {
                    "type": "nj_if",
                    "refer": "test0",
                    "content": [
                      {
                        "selfCloseTag": true,
                        "type": "input",
                        "params": { "id": "test5" }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      var tmplFn = compile(preTmpl, "preTmpl"),
        html = tmplFn(data);

      console.log(html);
      expect(html).toBe("<div name='my name:joe_sky,id:joe,name:joe_sky' id='test1' name1='../111'><span>sky:joe_sky,joe</span><span1>joe</span1><div id='555'><a/><input type='button'/><input id='test5'/></div></div>");
    });
  });
});