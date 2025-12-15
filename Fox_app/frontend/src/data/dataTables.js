export const ALL_MODELS = [
  { label: 'Tesla SXM4', value: 'SXM4', filter: ['TPC','EFT','IST','PHT','CHIFLASH','FLB','FLC'] },
  { label: 'Tesla SXM5', value: 'SXM5', filter: ['TPC','IST2','TEST'] },
  { label: 'Tesla SXM6', value: 'SXM6', filter: []}
];

export const sxm4Parts = [
  '692-2G506-0200-006', '692-2G506-0200-0R6', '692-2G506-0210-006', '692-2G506-0212-0R5',
  '692-2G506-0212-0R7', '692-2G506-0210-0R6', '692-2G510-0200-0R0', '692-2G510-0210-003',
  '692-2G510-0210-0R2', '692-2G510-0210-0R3', '965-2G506-0031-2R0', '965-2G506-0130-202',
  '965-2G506-6331-200',
];

export const sxm5Parts = [
  '692-2G520-0200-000', '692-2G520-0200-0R0', '692-2G520-0200-500', '692-2G520-0200-5R0',
  '692-2G520-0202-0R0', '692-2G520-0280-001', '692-2G520-0280-0R0', '692-2G520-0280-000',
  '692-2G520-0280-0R1', '692-2G520-0282-001', '965-2G520-0041-000', '965-2G520-0100-001',
  '965-2G520-0100-0R0', '965-2G520-0340-0R0', '965-2G520-0900-000', '965-2G520-0900-001',
  '965-2G520-0900-0R0', '965-2G520-6300-0R0', '965-2G520-A500-000', '965-2G520-A510-300',
  '692-2G520-0221-5R0',
]; 

export const redOctoberParts = [
  '920-23487-2530-0R0',
  '920-23487-2531-0R0',
];

export const stationBuckets = {
  test:["BAT","BBD","CHIFLASH","FLA","FLB","FLC","PHT","VI1","VI2","BIT","EFT","FCT","FI","FPF","FQC","IST","AVI_1","AVI_2","IQA","TEST","AOI"],
  repair:["Assembley","Bat_REPAIR","Disassembly","UPGRADE","ASSY2","PHT_REPAIR","RMA_ASSY","FCT_REPAIR","FQC_REPAIR","EFT_REPAIR","FI_REPAIR","CHIFLASH_REPAIR","BIT_REPAIR","VI2_REPAIR","BBD_REPAIR","Assembley_REPAIR","FLA_REPAIR","FPF_REPAIR","BAT_REPAIR","IST_REPAIR"],
  shipping:["RECEIVE","PACKING","SHIPPING"],
  sorting:["Warehouse","SORTING"],
  //lifetime:["BAT","BBD","CHIFLASH","FLA","FLB","FLC","PHT","VI1","VI2","BIT","EFT","FCT","FI","FPF","FQC","IST","AVI_1","AVI_2","IQA","TEST","AOI","Assembley","Bat_REPAIR","Disassembly","UPGRADE","ASSY2","PHT_REPAIR","RMA_ASSY","FCT_REPAIR","FQC_REPAIR","EFT_REPAIR","FI_REPAIR","CHIFLASH_REPAIR","BIT_REPAIR","VI2_REPAIR","BBD_REPAIR","Assembley_REPAIR","FLA_REPAIR","FPF_REPAIR","Warehouse","SORTING","BAT_REPAIR","IST_REPAIR"]
};

export const widgetList = [
  {type:"Station performance chart",params:[{type:"list",values:["Model"]}],tools:["dateRange","barRange"]},
  {type:"Fixture performance chart",params:[],tools:["dateRange","barRange"]},
  {type:"Packing output table",params:[{type:"list",values:["Model"]}],tools:["dateRange"]},
  {type:"Packing chart",params:[{type:"list",values:["Model"]},{type:"list",values:["daily","weekly"]}],tools:["dateRange"]},
  {type:"Pareto chart",params:[{type:"list",values:["Model"]}],tools:["dateRange","barRange"]},
];
