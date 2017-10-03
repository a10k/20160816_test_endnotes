var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var cheerio = require('cheerio')
var mammoth = require("mammoth");
//var tidy = require('htmltidy').tidy;
var beautify = require('js-beautify').html;
var Entities = require('html-entities').AllHtmlEntities;
entities = new Entities();

var app = express(); 
app.use(fileUpload());
app.use(express.static('public'));




app.post('/upload-indesign', function(req, res) {
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }
 
    indesign = req.files.indesign;
    text = indesign.data.toString('utf-8');
    text = handleHtml(text);

    //res.set({"Content-Disposition":"attachment; filename=\"clean_up_" + indesign.name + "\""});
    res.send(fillTemplate(text));
});





app.post('/upload-word', function(req, res) {
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }
    word = req.files.word;

    //No return value as it uses promise
    handleWord(word.data,res,(word.name.replace('docx','html')));
});




function handleHtml(text){
	text = text.replace(/ class="TEXT-TRANSFORMATION_endnote-superscript"/g,"")
	text = text.replace(/<sup>\s*(\d+)\s*<\/sup>/g,"<sup><a href='#endnote-$1' id='#endnote-sup-$1'>$1</a></sup>");

    var $ = cheerio.load(text)
    $('li.ENDNOTES-FOOTNOTES_endnotes-numbered').each(function(i, elem) {
      $(this).html($(this).html() + `<a href="#endnote-sup-${i+1}" id="endnote-${i+1}"> View in article</a>`);
    });
    var output =  $('body').html();
	 return output;
}




function handleWord(buff,res,name){
  var options = {
      styleMap: [
          "p[style-name='Quote'] => blockquote",
          "r[style-name='Quote Char'] => blockquote",
      ],
      convertImage:mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
              return {
                  src: "TBD"
              };
          });
      })
  };
  

  mammoth.convertToHtml({buffer: buff},options)
      .then(function(result){
          var html = result.value; // The generated HTML 
          var messages = result.messages; // Any messages, such as warnings during conversion
          //console.log(messages);

          outputToClient(html, res);
      })
      .done();
}




function fillTemplate(rteText){
  var string = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset=utf-8>
</head>
<body>
<h2>RTE CONTENT</h2>
<textarea rows="30" cols="100">
${rteText}
</textarea>
</body>
</html>
`;
return string;
}

function outputToClient(html, res){
  //fs.writeFileSync(__dirname + '/log.html', html,'utf8');
      //Load HTML
      html = beautify(html, { indent_size: 2 });

      //Preprocess file for [DUP:RULES]
      html = html.split('\n');
      var newHtml = [];
      html.map(function(eachLine){
        
      //Get pure inner text
      plainText = cheerio.load(eachLine).root().text();
      plainText = plainText.replace(/^\s+/,'');
      plainText = plainText.replace(/\s+$/,'');



        //BEGIN SIDEBAR DIV
        if(plainText === "[DUP:begin-sidebar]"){
          eachLine = '<div class="aside">';  
        }
        //END SIDEBAR DIV
        if(plainText === "[DUP:end-sidebar]"){
          eachLine = '</div>';  
        }




        //BEGIN QUOTE
        if(plainText === "[DUP:begin-quote]"){
          eachLine = '<blockquote><span class="text"><span class="quotes">';  
        }
        //BEGIN QUOTE ATTRIBUTION
        if(plainText === "[DUP:begin-attribution]"){
          eachLine = '</span></span><span class="attribution">';
        }
        //END QUOTE
        if(plainText === "[DUP:end-quote]"){
          eachLine = '</span></blockquote>';  
        }



        //BEGIN pullquote
        if(plainText === "[DUP:begin-pullquote]"){
          eachLine = '<blockquote><span class="text">';  
        }
        //END pullquote
        if(plainText === "[DUP:end-pullquote]"){
          eachLine = '</span></blockquote>';  
        }

        //Insert figure 
        if(plainText.match(/\[DUP:insert\-figure(\S+)\]/)){
          var imageId = plainText.replace(/.*\[DUP:insert\-figure(\S+)\].*/,'$1');
          
          var isNoshare = " DUPshare";
          var isAlign = "";
          var caption = "";
          var labelShare = "";
          var labelEmbed = "";

          if(plainText.match(/\[DUP:NO\-SHARE\]/)){ isNoshare = " "; }
          if(plainText.match(/\[DUP:ALIGN\-LEFT\]/)){ isAlign = " alignleft"; }
          if(plainText.match(/\[DUP:ALIGN\-RIGHT\]/)){ isAlign = " alignright"; }
          if(plainText.match(/\[DUP:CAPTION (.*?)\]/)){ caption = plainText.replace(/.*\[DUP:CAPTION (.*?)\].*/,'$1'); }
          if(plainText.match(/\[DUP:LABEL\-SHARE (.*?)\]/)){ labelShare = ` data-dup-label-share="` + plainText.replace(/.*\[DUP:LABEL\-SHARE (.*?)\].*/,'$1') + `"`; }
          if(plainText.match(/\[DUP:LABEL\-EMBED (.*?)\]/)){ labelEmbed = ` data-dup-label-embed="` + plainText.replace(/.*\[DUP:LABEL\-EMBED (.*?)\].*/,'$1') + `"`; }
          
          eachLine = `\n<!--Figure ${imageId}-->\n<img src="/content/dam/dup-us-en/articles/SLUG-TBD/${imageId}.jpg" class="-rwd${isNoshare}${isAlign}" alt="${caption}" data-dup-caption="${caption}" id="figure-${imageId}" ${labelShare} ${labelEmbed}/>\n`;
        }
         //Insert table (proposed by Junko nd Aditi) 
        if(plainText.match(/\[DUP:insert\-table(\S+)\]/)){
          var imageId = plainText.replace(/.*\[DUP:insert\-table(\S+)\].*/,'$1');
          
          var isNoshare = " DUPshare";
          var isAlign = "";
          var caption = "";
          var labelShare = "";
          var labelEmbed = "";

          if(plainText.match(/\[DUP:NO\-SHARE\]/)){ isNoshare = " "; }
          if(plainText.match(/\[DUP:ALIGN\-LEFT\]/)){ isAlign = " alignleft"; }
          if(plainText.match(/\[DUP:ALIGN\-RIGHT\]/)){ isAlign = " alignright"; }
          if(plainText.match(/\[DUP:CAPTION (.*?)\]/)){ caption = plainText.replace(/.*\[DUP:CAPTION (.*?)\].*/,'$1'); }
          if(plainText.match(/\[DUP:LABEL\-SHARE (.*?)\]/)){ labelShare = ` data-dup-label-share="` + plainText.replace(/.*\[DUP:LABEL\-SHARE (.*?)\].*/,'$1') + `"`; }
          if(plainText.match(/\[DUP:LABEL\-EMBED (.*?)\]/)){ labelEmbed = ` data-dup-label-embed="` + plainText.replace(/.*\[DUP:LABEL\-EMBED (.*?)\].*/,'$1') + `"`; }

          eachLine = `\n<!--Table ${imageId}-->\n<img src="/content/dam/dup-us-en/articles/SLUG-TBD/${imageId}.jpg" class="-rwd${isNoshare}${isAlign}" alt="${caption}" data-dup-caption="${caption}" id="table-${imageId}" ${labelShare} ${labelEmbed}/>\n`;
        }


        //Add nav id to the next element... 
        if(plainText === "[DUP:add-nav-id]"){
          eachLine = `<div class="ADD-ID-NXT"></div>`;  
        }

        if(eachLine.match(/\[DUP:insert\-interactive(.*?)\]/i)){ 
          eachLine = eachLine.replace(/.*\[DUP:insert\-interactive(.*?)\].*/i,'<div style="width:100%;height:400px;background-color:#000;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;"> Note to KS team: Please reach out to the \'Media Labs Team\' with the link to this webpage regarding the embed for interactive'+'$1'+'</div>');
        }


        newHtml.push(eachLine);

      });
      html = newHtml.join('\n');



      //Cheerio processing
      var $ = cheerio.load(html)
      var endnoteOlElement;
        $('ol').find('li').each(function (index, element) {
        if(typeof endnoteOlElement === 'undefined'){
          var thisId = $(element).attr('id');
          if(thisId && thisId.match(/^endnote-/)){
            //$(element.parent).attr('id','endnote')
            endnoteOlElement = $(element.parent);
            $(element.parent).remove();
          }
        }
      });
      // Add dup-generate-id data attribute to all next siblings to add nav placeholder 
      $('div[class="ADD-ID-NXT"]').each(function(index, element) {
        var div = $(this);
        var next = div.next();
        div.remove();
        next.attr('data-dup-generate-id','true');
      });
      // Add dup-generate-id data attribute to all h2 
      $('h2').each(function(index, element) {
        var h2 = $(this);
        h2.attr('data-dup-generate-id','true');
      });

      // Replace the [N] to N for sup script anchors
      $('sup').find('a').each(function(index, element) {
        var supText = $(this);
        if(supText.text() && supText.text().match(/\[\d+\]/) ){
          supText.text(supText.text().replace('[','').replace(']',''));
          if(supText.attr('id')){
            supText.attr('id',supText.attr('id').replace('ref','sup'));//FIX TO MATCH DD HARDCODED VALUE
          }
        }
      });

      //Fix double sup > sup
      $('sup').find('sup').each(function(index, element) {
        var supSup = $(this);
        if(supSup.parent()[0].children.length === 1){
          var sup = $(element.parent)
          sup.html($(element).html())
        }
      });


      //Fix blockquote span quote text p redundant issue
      $('blockquote').find('span[class="quotes"]').each(function(index, element) {
        var pInQuote = $(this);
        $(pInQuote).find('p').each(function(nestedIndex, nestedElement){
          $(nestedElement).replaceWith($(nestedElement).html())
        })
        //Oct 3: Removing the smart quotes for begin quote markup
        var afterRemovingSamrtQuote = $(pInQuote).html();
        afterRemovingSamrtQuote = afterRemovingSamrtQuote.replace(/(^\s)(\&#x201C\;)/,'$1');
        afterRemovingSamrtQuote = afterRemovingSamrtQuote.replace(/(\&#x201D\;)(\s$)/,'$2');

        $(pInQuote).html(afterRemovingSamrtQuote);
      });
      //Fix blockquote span text p redundant issue
      $('blockquote').find('span[class="text"]').each(function(index, element) {
        var pInQuote = $(this);
        $(pInQuote).find('p').each(function(nestedIndex, nestedElement){
          $(nestedElement).replaceWith($(nestedElement).html())
        })
      });
      
      //Find and prepare h2/add-nav ids and build an array
      var h2Array = [];
      $('*[data-dup-generate-id="true"]').each(function(index, element) {
        var heading = $(this);
        heading.removeAttr('data-dup-generate-id');
        var headingText = heading.text()||'';
        var headingId = headingText.replace(/[^a-zA-Z0123456789]+/g,'-').toLowerCase().replace(/^\-/,'').replace(/\-$/,'');
        headingId = headingId.substring(0, Math.min(32,headingId.length)).replace(/\-$/,'');
        h2Array.push({id:headingId, text: headingText});
        $(element).attr('id', headingId)
      });

      /*Add drop caps to all p next to the h2
      $('h2').each(function(index, element) {
        var heading = $(this);
        var nextP = heading.next('p');
        nextP && nextP.addClass('-with-dropCap');
      });
      */
      //Only first parahrapg in document must be dropcap
      $('p').each(function(index, element) {
        index==0 && $(element).addClass('-with-dropCap');
      });
      //For styling first word
      $('p.-with-dropCap').each(function(index, element) {
        var originalText = $(element).html();
        var modifiedText = originalText.replace(/([^\s]+)/,'<span class="-first-word">$1</span>');
        $(element).html(modifiedText);
      });
      // Remove all H1
      $('h1').each(function(index, element) {
        var h1 = $(this);
        h1.wrap($(`<!-- WARNING: H1 REMOVED FROM WORD DOC "${h1.text()}"-->`))
      });



      // Replace arrow with ' View in article' for all li in endnotes ol  
      var E = cheerio.load(cheerio.load('').root().append(endnoteOlElement).html());
      E('li').find('a').each(function(index, element) {
        var link = E(this);
        if(link.attr('href') && link.attr('href').match(/^#endnote/)){
          link.text(' View in article');
          link.attr('id', E(link).parents('li').attr('id'));
          link.attr('href', link.attr('href').replace('ref','sup'));//FIX TO MATCH DD HARDCODED VALUE
          E(link).parents('li').removeAttr('id');
        }
      });




  var h2Text = h2Array.map(function(heading){
    return `<li><textarea cols="40" rows="2">${heading.text}</textarea><textarea cols="20" rows="2">#${heading.id}</textarea></li>`;
  }).join('\n\n');
  if(h2Text){
    h2Text = '<h2>IN-ARTICLE NAVIGATION</h2><ul>'+h2Text+'</ul>';
  }
  var rte = $.html();
  var endnote = E.html();

  var string = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset=utf-8>
<link href='https://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
<style>
*{
  font-family: 'Open Sans'
}
html,body{
  margin: 0px;
  padding: 0px;
}
.Header{
  background-color: black;
  margin: 0px;
  font-size: 20px;
  padding: 14px;
  color: white;
}
textarea{
  display:block;
  margin-left:auto;
  margin-right:auto;
}
h2{
  padding:8px;
}
li textarea {
    display: inline-block;
    margin: 5px;
}
li{
    list-style-type: none;
}
</style>
</head>
<body>
<div class="Header"><a style="color:white;" href="/">&larr; Back</a> Publishing Workflow Automation Tool - Prototype</div>
${h2Text}
<h2>RTE CONTENT</h2>
<textarea rows="30" cols="100">
${entities.encode(rte)}
</textarea>
<h2>ENDNOTES CONTENT</h2>
<textarea rows="30" cols="100">
${entities.encode(endnote)}
</textarea>
<br>
<br>
</body>
</html>
`;

      res.send(string);
      
}


app.listen(process.env.PORT || 3000, function () {});