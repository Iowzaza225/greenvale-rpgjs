export const CAMP_MAP_ID = "greenvale-camp";
export const CAMP_WIDTH = 1600;
export const CAMP_HEIGHT = 1000;
export const CAMP_HITBOXES = [
  { id:"top-wall", x:0, y:0, width:CAMP_WIDTH, height:10 },
  { id:"bottom-wall", x:0, y:CAMP_HEIGHT-10, width:CAMP_WIDTH, height:10 },
  { id:"left-wall", x:0, y:0, width:10, height:CAMP_HEIGHT },
  { id:"right-wall", x:CAMP_WIDTH-10, y:0, width:10, height:CAMP_HEIGHT },
  { id:"lake", x:70, y:85, width:390, height:255 },
  { id:"mara-house", x:510, y:190, width:280, height:170 },
  { id:"workshop", x:240, y:210, width:180, height:105 },
  { id:"safehouse", x:1070, y:620, width:230, height:135 }
];
