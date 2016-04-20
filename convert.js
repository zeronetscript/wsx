"use strict"
var fs=require('fs');
var jsdom=require('jsdom');
var process=require('process');
var path=require('path');

var jsonfile = require("jsonfile")
var WaitGroup=require('waitgroup');

var wg=new WaitGroup;

var changed =false;



var dir='article';

var jqueryPath=path.join(__dirname,"jquery.js");

if (fs.accessSync(jqueryPath)) {
    console.log(jqueryPath+" not exits,exit");
    return;
}

var jquery = fs.readFileSync(jqueryPath,"utf-8");

var old_data = jsonfile.readFileSync("data.json");

var next_post_id = old_data.next_post_id;

function alreadyHave(title){
    for (var i in old_data.post){
        if(old_data.post[i].title==title){
            return true;
        }
    }
    return false;
}

function writeCurrent(){
    old_data.modified = (new Date).getTime()/1000;
    jsonfile.writeFileSync('new_data.json',old_data,{spaces:2});
    console.log("length "+old_data.post.length+":write new file to new_data.json");
}

function parseBlog(err,win){

        

    if (err) {
        console.log(err);
        win.close();
        wg.done();
        return;
    }

    var $ = win.$;

    var title=$("#blog_main_left div.blog_main_left_content h3 > a").text();

    if (alreadyHave(title)) {
    
        console.log("skip:"+title);
        wg.done();
        win.close();
        return;
    }

    var date=$('#blog_main_left div.blog_main_time > p').text();

    var bodyDoms=$("#blog_article_content p");

    var body="";

    console.log("add "+title);

    for(var i in bodyDoms){
        var pText = bodyDoms[i].outerHTML;
        if (pText!=undefined) {
            body=body+pText;
        }
    }

    var post = {
        post_id: old_data.next_post_id,
        title:title,
        date_published: (new Date(date)).getTime()/1000,
        body:body
    };

    old_data.post.unshift(post);
    old_data.next_post_id = old_data.next_post_id+1;
    changed=true;

    if (old_data.post.length%20==0) {
        writeCurrent();
    }

    wg.done();
    win.close();

}


fs.readdir(dir,function(err,files){

    for(var i in files){


        if (!files[i].endsWith(".html")) {
            continue;
        }

        console.log("process "+files[i]);

        wg.add();

        jsdom.env({
            file:path.join(process.cwd(),dir,files[i]),
            src:[jquery],
            done:parseBlog
        });
    }
});


wg.wait(writeCurrent);

