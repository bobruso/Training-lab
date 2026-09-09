export function fixture(){
 const def=Buffer.from([0x40,0,0,20,0,4,253,4,0x86,5,4,0x86,6,2,0x84,3,1,2]);
 const records=[];
 for(let i=0;i<=1200;i++){const r=Buffer.alloc(12);r[0]=0;r.writeUInt32LE(1157846400+i,1);r.writeUInt32LE(i*500,5);r.writeUInt16LE(5000,9);r[11]=150;records.push(r);}
 const data=Buffer.concat([def,...records]);const header=Buffer.alloc(14);header[0]=14;header[1]=0x20;header.writeUInt16LE(2100,2);header.writeUInt32LE(data.length,4);header.write('.FIT',8);
 const crc=b=>{let c=0;for(const x of b){c^=x;for(let j=0;j<8;j++)c=(c&1)?(c>>>1)^0xA001:c>>>1;}return c;};
 header.writeUInt16LE(crc(header.subarray(0,12)),12);const content=Buffer.concat([header,data]);const tail=Buffer.alloc(2);tail.writeUInt16LE(crc(content));return Buffer.concat([content,tail]);
}
