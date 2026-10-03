const {Companion}=require('./companion');

const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const bounded=(value,max)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;

// Reject impossible dates as well as spreadsheet formula prefixes. Do not use
// Date parsing here: normalization would turn February 30 into a different day.
function validDay(day){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const [year,month,date]=day.split('-').map(Number);
  if(year<1||month<1||month>12)return false;
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const length=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
  return date>=1&&date<=length;
}

function exportDate(now){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getFullYear()<1||now.getFullYear()>9999||now.getUTCFullYear()<1||now.getUTCFullYear()>9999)
    throw new Error('导出时间无效。');
  return `${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

/**
 * Pure, local-only serializer. The optional third argument is a Date for tests.
 * Retains at most the newest 90 valid recorded days and 30 current tasks, the
 * same retention limits as Journal. CSV contains daily totals only, never task
 * text; JSON includes explicitly allowed task and companion fields, not paths.
 */
function createExport(format,input={},now=new Date()){
  if(format!=='csv'&&format!=='json')throw new Error('只支持 CSV 或 JSON 导出。');
  const stamp=exportDate(now);
  const source=isRecord(input)?input:{};
  const journal=isRecord(source.journal)?source.journal:{};
  const days=isRecord(journal.days)?journal.days:{};
  const dailyRecords=Object.keys(days).filter(day=>validDay(day)&&isRecord(days[day])).sort().slice(-90).map(day=>({
    day,rounds:bounded(days[day].rounds,1000),focusSeconds:bounded(days[day].seconds,86400),
  }));
  const filename=`workFeiBi-records-${stamp}.${format}`;
  if(format==='csv'){
    // All cells are fixed headers, validated ISO dates or bounded integers.
    // BOM supports Chinese headers in Excel; CRLF is the CSV record separator.
    const rows=[['日期','专注轮次','专注秒数'],...dailyRecords.map(row=>[row.day,row.rounds,row.focusSeconds])];
    return {filename,content:'\uFEFF'+rows.map(row=>row.join(',')).join('\r\n')+'\r\n',mime:'text/csv;charset=utf-8'};
  }
  const tasks=Array.isArray(journal.tasks)?journal.tasks.slice(0,30).filter(task=>isRecord(task)&&typeof task.text==='string'&&task.text.trim()).map(task=>({text:task.text.trim().slice(0,100),done:task.done===true})):[];
  const companion=new Companion(isRecord(source.companion)?source.companion:{}).serialize();
  const content=JSON.stringify({schemaVersion:1,exportedAt:now.toISOString(),dailyRecords,tasks,companion},null,2)+'\n';
  return {filename,content,mime:'application/json;charset=utf-8'};
}

module.exports={createExport};
