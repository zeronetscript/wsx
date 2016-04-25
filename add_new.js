"use strict"
var fs = require("fs")
var jsonfile = require("jsonfile")
var FeedParser = require('feedparser');
var request = require('request')
var path = require('path')
var jsdom = require('jsdom')

var feedparser = new FeedParser();


var WaitGroup=require('waitgroup');

var wg=new WaitGroup;

var jqueryPath=path.join(__dirname,"jquery.js");

if (fs.accessSync(jqueryPath)) {
    console.log(jqueryPath+" not exits,exit");
    return;
}

var jquery = fs.readFileSync(jqueryPath,"utf-8");


var old_data = jsonfile.readFileSync("data.json");


function alreadyHave(title){

  for (var i in old_data.post){
    if(old_data.post[i].title==title){
      return true;
    }
  }

  return false;

}



var req = request("http://blog.ifeng.com/rss/2365959.xml");


var changed = false;

wg.add();
feedparser.on('readable',function(){

  var stream = this;
  var article;

  while(article=stream.read()){
    if(alreadyHave(article.title)){
      console.log("skip "+article.title);
      continue;
    }

    wg.add();

    var title=article.title;

    jsdom.env({
        url:encodeURI(article.link),
        src:[jquery],
        done:function(err,window){
          if (err) {
            wg.done();
    
            window.close();
            return;
          }

          var $ = window.$;


          var date=$('#blog_main_left div.blog_main_time > p').text();

          var bodyDoms=$("#blog_article_content p");

          var tag=$("#blog_main_left div.blog_main_time h5 a").text();

          var body="";

          console.log("add :"+title);

          for(var i in bodyDoms){
            var pText = bodyDoms[i].outerHTML;
            if (pText!=undefined) {
              body=body+pText;
            }
          }

          var dateObj=new Date(date);

          var post = {
            post_id: old_data.next_post_id,
            title:title,
            date_published: dateObj.getTime()/1000,
            body:"---\n"+body
          };

          if (tag!="") {
            old_data.tag.push({
              value:tag,
              post_id:post.post_id
            });
            
          }

          old_data.post.unshift(post);
          old_data.next_post_id = old_data.next_post_id+1;

          changed=true;
          wg.done();
          window.close();
        }
    });

  }

});

feedparser.on('end',function(){
  wg.done();
})

req.on('response',function(res){
	    if (res.statusCode!=200) {
		    console.log(thisOne.name+" error done");
		    return;
	    }

	    res.pipe(feedparser);
    });

wg.wait(function(){
  if (!changed) {
    console.log("unchanged");
    return;
  }

  old_data.modified = (new Date).getTime()/1000;
  jsonfile.writeFileSync('new_data.json',old_data,{spaces:2});
  console.log("write new file to new_data.json");
});

