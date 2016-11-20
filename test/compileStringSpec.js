﻿var nj = require('../src/base'),
  utils = require('../src/utils/utils'),
  compile = require('../src/compiler/compile').compile;

describe('test compile string', function () {
  beforeAll(function () {
    nj.registerFilter('filter1', function (v) {
      //console.log(this.useString);
      return v * 2;
    });
    nj.registerFilter('filter2', function (v, p1, p2) {
      //console.log(p1 + '_' + p2);
      return v + 5;
    });
    nj.registerFilter('filter3', function (v) {
      return !!!v;
    });
    nj.registerFilter('tagName', function (v) {
      return v + 'Tmp';
    });
  });

  describe('compile string template to html', function () {
    it('test compile 1', function () {
      var data = {
        name: "<i>joe_sky1</i>",
        id: 100,
        test0: false,
        list: [0, 1, 2],
        c1: 100,
        sliderItem: {
          a: 'sliderItem',
          b: 'sliderItem1'
        },
        a: {
          b: '__abc',
          c: {
            d: 'bcd'
          },
          e: {
            f: {
              g: 'efg'
            }
          }
        }
      };

      var tmpl1 = `
        <div name1="../111" class="{ c1 } c0{ '5':filter1 '!' '10':filter1(1) } c2" id1=666 id2=777 name="my name:{'name' name},id:{id},name:{name}" id=test1>
          <span>
            sky:{name},{id}
          </span>
          <span1>
            joe
          </span1>
          <div id=555>
            <a />
            <input type=button />
            <#unless {test0}>
              <input id="test5" />
            </#unless>
          </div>
        </div>
      `;

      var tmpl2 =
      '<div name1=../111>\
         <span>\
           <img />\
           sky:{name},{ id: filter2(1, 2) }${0}\
         </span>\
       </div>';

      var tmpl3 = nj`
        <div name=test1 autofocus name1={a.c.d} name2={a.e:prop(f).g}>
          <#props>
            <#prop {'name'}>{test0:filter1 'test1':filter2 'test2'}</#prop>
            <#each {list}>
              <#prop {'data-name' .}>{.:filter1 'test1' 'test2'}</#prop>
            </#each>
            <#prop {'data-name10'}>
              <#each {list}>
                <#if {.}>{ #:filter2 }<#else />{ '100':filter1 }</#if>
              </#each>
            </#prop>
          </#props>
          <input autofocus />
          <br></br>
          test2
          <span>
            ${tmpl2}
            <img />
            sky:{{ 'name555' }},{ id: filter2 }
            <section>
            ${tmpl1}
            </section>
            <input type=button />
            ${nj`
              <#each { list }>
                <slider>
                  <{../sliderItem.a:tagName} checked no='{ ../sliderItem.b }' />
                </slider>
              </#each>
            `}
          </span>
        </div>
      `;

      var tmplFn = compile(tmpl3, 'tmplString'),
        html = tmplFn(data);

      //console.log(JSON.stringify(nj.asts['tmplString']));
      console.log(html);
      expect(html).toBeTruthy();
    });
  });
});