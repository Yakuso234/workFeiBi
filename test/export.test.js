const test=require('node:test');
const assert=require('node:assert/strict');
const {createExport}=require('../src/export');
const {Journal}=require('../src/journal');

const now=new Date(2026,9,2,12,34,56);

test('empty export has safe filename, Chinese CSV headers, BOM and CRLF',()=>{
  const result=createExport('csv',{},now);
  assert.equal(result.filename,'workFeiBi-records-2026-10-02.csv');
  assert.equal(result.content,'\uFEFF日期,专注轮次,专注秒数\r\n');
  assert.equal(result.mime,'text/csv;charset=utf-8');
  const json=createExport('json',null,now);
  assert.equal(json.filename,'workFeiBi-records-2026-10-02.json');
  const data=JSON.parse(json.content);
  assert.equal(data.schemaVersion,1);
  assert.equal(data.exportedAt,now.toISOString());
  assert.deepEqual(data.dailyRecords,[]);
  assert.deepEqual(data.tasks,[]);
  assert.deepEqual(data.companion,{totalInteractions:0,completedRounds:0,bond:0,mood:70,energy:80});
});

test('actual journal serialization exports chronological exact seconds without mutating input',()=>{
  const journal=new Journal();
  journal.record(1501,new Date(2026,9,2));
  journal.record(25,new Date(2026,8,30));
  const input={journal:journal.serialize(),companion:{bond:20}};
  const before=JSON.stringify(input);
  const data=JSON.parse(createExport('json',input,now).content);
  assert.deepEqual(data.dailyRecords,[{day:'2026-09-30',rounds:1,focusSeconds:25},{day:'2026-10-02',rounds:1,focusSeconds:1501}]);
  assert.equal(JSON.stringify(input),before);
  assert.equal(createExport('csv',input,now).content,'\uFEFF日期,专注轮次,专注秒数\r\n2026-09-30,1,25\r\n2026-10-02,1,1501\r\n');
});

test('JSON preserves Unicode task text but allowlists fields and excludes local paths',()=>{
  const input={
    journal:{days:{'2026-10-02':{rounds:2,seconds:3000,password:'secret'}},tasks:[{id:'C:/secret',text:'=SUM(1,2)\n学习「糯糯」🎉',done:true,audioPath:'D:/voice.mp3'}],position:'private'},
    companion:{bond:5,totalInteractions:8,mood:62,energy:90,completedRounds:2,audio:'private'},
    config:{audioPath:'private'},
  };
  const result=createExport('json',input,now);
  const data=JSON.parse(result.content);
  assert.deepEqual(Object.keys(data),['schemaVersion','exportedAt','dailyRecords','tasks','companion']);
  assert.deepEqual(data.tasks,[{text:'=SUM(1,2)\n学习「糯糯」🎉',done:true}]);
  assert.deepEqual(data.companion,{totalInteractions:8,completedRounds:2,bond:5,mood:62,energy:90});
  assert.doesNotMatch(result.content,/private|secret|audio|position|password/);
  assert.doesNotMatch(createExport('csv',input,now).content,/SUM|学习|🎉/);
});

test('invalid dates, formula cells and corrupt totals never reach CSV',()=>{
  const days={
    '=HYPERLINK("x")':{rounds:1,seconds:1},'\t=1+1':{rounds:1,seconds:1},
    '2026-02-29':{rounds:1,seconds:1},'1900-02-29':{rounds:1,seconds:1},
    '2026-13-01':{rounds:1,seconds:1},'2026-01-00':{rounds:1,seconds:1},
    '2026-02-30':{rounds:1,seconds:1},'0000-01-01':{rounds:1,seconds:1},
    '2024-02-29':{rounds:2.9,seconds:123.7},'2000-02-29':{rounds:-2,seconds:Infinity},
    '2026-10-02':{rounds:100000,seconds:1000000},'2026-10-03':{rounds:'=1+1',seconds:'1500'},
    '2026-10-04':null,'2026-10-05':[],
  };
  const result=createExport('csv',{journal:{days}},now);
  assert.equal(result.content,'\uFEFF日期,专注轮次,专注秒数\r\n2000-02-29,0,0\r\n2024-02-29,2,123\r\n2026-10-02,1000,86400\r\n2026-10-03,0,0\r\n');
});

test('export retention and numeric bounds match local data model',()=>{
  const days={};
  for(let i=0;i<120;i++){
    const date=new Date(2026,0,i+1,12);
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    days[key]={rounds:1,seconds:60};
  }
  const tasks=Array.from({length:35},()=>({text:'糯'.repeat(150),done:1}));
  const companion={bond:999,mood:-1,energy:NaN,totalInteractions:Infinity,completedRounds:2000000};
  const data=JSON.parse(createExport('json',{journal:{days,tasks},companion},now).content);
  assert.equal(data.dailyRecords.length,90);
  assert.equal(data.dailyRecords[0].day,'2026-01-31');
  assert.equal(data.dailyRecords.at(-1).day,'2026-04-30');
  assert.equal(data.tasks.length,30);
  assert.equal(data.tasks[0].text.length,100);
  assert.equal(data.tasks[0].done,false);
  assert.deepEqual(data.companion,{totalInteractions:0,completedRounds:1000000,bond:100,mood:0,energy:80});
});

test('malformed containers and task entries are handled without coercing objects',()=>{
  for(const input of [null,undefined,0,'bad',[],{journal:null},{journal:{days:[],tasks:{}}}])
    assert.deepEqual(JSON.parse(createExport('json',input,now).content).dailyRecords,[]);
  const data=JSON.parse(createExport('json',{journal:{tasks:[null,{},[],{text:'  '},{text:2},{text:'  喝水  ',done:true}]},companion:[]},now).content);
  assert.deepEqual(data.tasks,[{text:'喝水',done:true}]);
});

test('unknown formats and invalid timestamps fail before creating any output',()=>{
  for(const format of ['xml','../csv','CSV','__proto__',null,undefined,{}])
    assert.throws(()=>createExport(format,{},now),/只支持 CSV 或 JSON/);
  for(const date of [new Date(NaN),'2026-10-02',null,0,new Date('10000-01-01')])
    assert.throws(()=>createExport('csv',{},date),/导出时间无效/);
});
