var scraper = require('scraper');
var fs = require("fs");
var outputFile = "./output_hardware.txt";
var output = "";

function goScrape(theUrl) {
  console.log("--------------");
  console.log("URL: " + theUrl);
  scraper(
    {
       'uri': theUrl
           , 'headers': {
               'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'
           }
    }
    ,function(err, $) {
        if (err) {throw err}
        
        if($("#left_rail,#left_rail_pl")) {
          var curr_level = $("#left_rail h1,#left_rail_pl h4:first").text();
          
          if(curr_level != "Refine Results" && curr_level != "How-To Library") {
            console.log("[PAGE TITLE] " + curr_level);
            $('#left_rail li a,#left_rail_pl ul li a').each(function() {
              var item_link = 'http://www.lowes.com' + $(this).attr('href');
              var item_text = $(this).text();
              var pathRegx = new RegExp("\/([a-zA-Z0-9\/\-]+)?_/","gi");
              var item_path = pathRegx.exec(item_link)[1];
              item_text = item_text.replace(new RegExp("\\(([0-9]+)\\)", "gi"),'');
              var output = item_path + ',' + curr_level + ',' + item_text + '\n';
              console.log("[ITEM] " + item_path + ',' + curr_level + ',' + item_text);
              fs.appendFileSync(outputFile,output,'utf8');
              goScrape(item_link);
            });
          }
        }
    }
    ,
    {
reqPerSec: 0.2
    }
);
};

goScrape('http://www.lowes.com/Plumbing/_/N-1z13dr7/pc');