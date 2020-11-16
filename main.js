console.log("Loading function");
const aws = require("aws-sdk");
const simpleParser = require("mailparser").simpleParser;
// let domparser = new DOMParser()​​

const jsdom = require("jsdom");
const {JSDOM} = jsdom;


const s3 = new aws.S3({apiVersion: "2006-03-01"});

// パース対象のメールオブジェクト
const mailParams = {
  Bucket: "s3-numrock-k.com",
  Key: "raw-data/mbh045ea0vbrlcobgpiqq3r9g1gigrf2o8399ag1",
};

s3.listBuckets((e, data) => {
  // console.log(data.Buckets);
  data.Buckets.forEach((element) => {
    // console.log(element);
  });
});

async function getObjectStringFromS3(params) {
  let jsonStr = {}
  try {
    result = await s3.getObject(params).promise();
    jsonStr = result.Body.toString();
  } catch (err) {
    console.log(err);
  }
  return jsonStr;
}

async function parseMail(params){
  try {
    result = await s3.getObject(params).promise();
    jsonStr = result.Body.toString();
    const mailText = result.Body.toString();
    const parsed = await simpleParser(mailText);
    return parsed;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function createRakutenHistoryObjectByMail(params) {
  try {
    const result = await s3.getObject(params).promise()
    const mailText = result.Body.toString();
    const parsed = await simpleParser(mailText);
    const {window} = new JSDOM(parsed.html.toString());
    const $ = require("jquery")(window);
    let tbodyContent = $("tbody:contains('利用先')");
    // 最も内部のtbody要素
    elements = Array.from(tbodyContent.slice(-1)[0].children);
    let rowNames = Array.prototype.slice.call(elements[0].children).map((element) => {
      return element.textContent.trim().replace(/\n\t|\s+/g, "");
    });
    // 利用履歴が2行以上になるときに注意
    let values = Array.prototype.slice.call(elements[1].children).map((element) => {
      return element.textContent.trim().replace(/\n\t|\s+/g, "");
    });
    var map = {}
    let histories = []
    rowNames
      .forEach((name, index) => {
        if (!(["利用日", "利用先", "利用金額"].includes(name))) return;
        map[name] = values[index]
      })
    histories.push(map)
    return histories;
  } catch (err) {
    console.log(err)
    return null;
  }
}

async function setData() {
  try {
    const histories = await createRakutenHistoryObjectByMail(mailParams);
    const objParams = {
      Bucket: "s3-numrock-k.com",
      Key: "rakuten-history/data2",
    };
    const objectJson = await getObjectStringFromS3(objParams)
    let dataObject = JSON.parse(objectJson)
    //const date = histories[0]["利用日"]
    const date = "2020/11/10"
    if (dataObject[date]) {
      dataObject[date] = dataObject[date].concat(histories)
    } else {
      dataObject[date] = histories
    }
    console.log(dataObject);
    var params = {
      Body: JSON.stringify(dataObject),
      Bucket: "s3-numrock-k.com",
      Key: "rakuten-history/data2"
    }

    s3.putObject(params, (err, data) => {
      if (err) console.log(err, err.stack); // an error occurred
      else console.log(data);           // successful response
    })
  }catch (err){
    console.log(err)
  }
}

setData()
//parseMail(mailParams)
//let a = 10
//test()

