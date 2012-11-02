var fs = require("fs");

fs.readdir(path, function(err,files) {
	if (err) throw err;

	for(file in files) {
		fs.readFile(file, function (err, data) {
		  if (err) throw err;
		  var records = data.split('\n');

		  for(record in records) {
		  	cols = record.split('\t');
		  	console.log(cols);
		  }

		});
	}
});