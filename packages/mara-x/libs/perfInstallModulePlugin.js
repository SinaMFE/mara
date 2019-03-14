/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
let path = require("path");
module.exports = class perfInstallModulePlugin {
	constructor(options) {
        this.options = options || {};
        this.PackageJSON= require(path.join(process.cwd(),"./package.json"));
        this.options.url = this.options.url?this.options.url:"";
	}
	apply(compiler) {
        let me =this;
		compiler.plugin("compilation", (compilation, params) => {
            compilation.mainTemplate.plugin("local-vars", function(source, chunk, hash){
                return this.asString([
                    source,
                    "// The module cache",
                    `let countTimeMap = {};`,
                    `let RecordTime=[];
                     let currentNode_COUNT=null;
                    `,
                    `let countTimeArr = [];
                    let pageName='';
                    if(typeof window !=='undefined'){
                        pageName =window["location"].pathname.split(".")[0];
                    }
                    function formatJson (list) {
                        let pid = []
                        let items = []
                        let index = []
                        pid.push(list[0].moduleId)
                        items.push(list[0])
                        index.push(0)
                        for (let i = 1;i < list.length - 1;i++) {
                          if (list[i].type === 'start') {
                            list[i].pid = pid[pid.length - 1]
                            pid.push(list[i].moduleId)
                            items.push(list[i])
                            index.push(items.length - 1)
                          }else {
                            let whereNow = index.pop()
                            // console.log("参数",whereNow)
                            items[whereNow].time = new Date(list[i].value) - new Date(items[whereNow].value)
                            pid.pop()
                          }
                        }
                        return items
                      }
                      let resultMap = [];
                      function getTrees (data, pid) {
                        var result = [], temp
                        for (var i in data) {
                          if (data[i].pid == pid) {
                            delete data[i].value
                            delete data[i].type
                            result.push(data[i])
                            temp = getTrees(data, data[i].moduleId);
                            //计算self 时间
                            data[i].selftime=data[i].time;
                            for(var k in temp){
                                data[i].selftime =data[i].selftime-temp[k].time;
                            }
                            resultMap.push(data[i]);
                            if (temp.length > 0) {
                              data[i].children = temp
                            }
                          }
                        }
                        return result
                      }
                    `,
                    `setTimeout(function(){
                        
                        let projectName = '${me.PackageJSON.name}';
                        let version = '${me.PackageJSON.version}';
                        console.log("模块性能指标前20,本测算是指某个模块在初始化时消耗的时间（单位ms),工程名:"+projectName,"页面名:",pageName,"版本号:",version);
                        console.log(getTrees(formatJson(RecordTime) , 0));

                        resultMap.sort(function(a,b){
                            return b.selftime-a.selftime;
                        });
                        resultMap=resultMap.map(m=>{
                            m.moduleId=m.moduleId+"";
                            if(m.moduleId.indexOf('?')>0){
                                m.moduleId = m.moduleId.split("?")[1];
                            }
                            m.moduleId=m.moduleId.replace("./node_modules/","");
                            if(m.moduleId.indexOf('!')>0){
                                m.moduleId = m.moduleId.split("!")[1];
                            }
                            return {name:m.moduleId,time:m.selftime}
                        })
                        try{
                            let postData ={
                                resultMap:resultMap,
                                projectName:projectName,
                                pageName:pageName,
                                version:version
                            };
                            let url = '${me.options.url}';
                            if(url!=''){
                                fetch(url, {
                                method: 'POST',
                                mode: 'cors',
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                },
                                body: JSON.stringify(postData)
                            }).then(function(response) {
                                console.log('上报perf-module-self-executing日志成功！');
                            }).catch(function(ex){
                                console.log('上报perf-module-self-executing日志失败！');
                            });
                            }
                            
                        }
                        catch(ex){
                            console.log('上报perf-module-self-executing日志失败')
                        }
                        console.table(resultMap.slice(0,20));
                    },5000)`,
                    "var installedModules = {};"
                ]);
            });
            compilation.mainTemplate.plugin("require", function(source, chunk, hash){
                return this.asString([
                    "// Check if module is in cache",
                    "if(installedModules[moduleId]) {",
                    this.indent("return installedModules[moduleId].exports;"),
                    "}",
                    "// Create a new module (and put it into the cache)",
                    "var module = installedModules[moduleId] = {",
                    this.indent(this.applyPluginsWaterfall("module-obj", "", chunk, hash, "moduleId")),
                    "};",
                    "",
                    this.asString( [
                        "// Execute the module function",
                        `
                            let start = new Date();
                            RecordTime.push({
                                moduleId:moduleId,
                                value:start,
                                type:"start"
                            })
                            countTimeMap[moduleId]={start:start};
                            currentNode_COUNT=moduleId;
                        `,
                        `modules[moduleId].call(module.exports, module, module.exports, ${this.renderRequireFunctionForModule(hash, chunk, "moduleId")});`,
                        `
                        let end =new Date();
                        countTimeMap[moduleId].end=end;
                        countTimeMap[moduleId].time=countTimeMap[moduleId].end-countTimeMap[moduleId].start;
                        if(currentNode_COUNT==moduleId){
                            countTimeMap[moduleId].isleaf = true;
                        }
                        countTimeMap[moduleId].name = moduleId;
                        countTimeArr.push(countTimeMap[moduleId]);
                        RecordTime.push({
                            moduleId:moduleId,
                            value:end,
                            type:"end"
                        })
                        `
                    ]),
                    "",
                    "// Flag the module as loaded",
                    "module.l = true;",
                    "",
                    "// Return the exports of the module",
                    "return module.exports;"
                ]);
            });
		});
	}
};
