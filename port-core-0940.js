(function(root){
'use strict';
function chainPower(n){return n<2?0:n>=20?24+Math.floor((n-20)/2)*6:n>=10?18:n>=5?12:6;}
function attackPower(n,combo){return (n>=4?n:0)+chainPower(combo);}
function special(roll){if(roll<.15)return 'flip';if(roll<.225)return 'change';const x=(roll-.225)/.775*37;return x<9?'row':x<18?'col':x<26?'bomb':x<31?'burst':'cut';}
function cleanStats(s){if(!s||typeof s!=='object')return null;const out={};for(const k of ['cleared','converted','chain'])out[k]=Number.isSafeInteger(s[k])&&s[k]>=0?s[k]:0;return out;}
function advanceSeries(s,result,id){if(s.completed===id)return false;s.completed=id;if(result==='win')s.wins++;else if(result==='lose')s.losses++;s.over=Math.max(s.wins,s.losses)>=s.target;return true;}
function nextSeries(s){if(s.over){s.wins=s.losses=0;s.over=false;}}
function packetBatches(power){const out=[];while(power>0){const batch=[];for(let i=0;i<8&&power>0;i++){const cells=Math.min(24,power);batch.push({w:Math.min(6,cells),h:Math.ceil(cells/6),cells});power-=cells;}out.push(batch);}return out;}
const api={chainPower,attackPower,special,cleanStats,advanceSeries,nextSeries,packetBatches};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JdpPort=api;
})(typeof window!=='undefined'?window:globalThis);
