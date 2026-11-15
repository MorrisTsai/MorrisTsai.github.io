export const isReadable=section=>!section.isHeading||section.blocks?.length>0;
const inside=(path,scope)=>scope.every((name,index)=>path?.[index]===name);
export function chapterSections(doc,section){
 if(doc.id==='competency-standards'||(doc.id==='regulations-endnotes'&&section.blocks?.length))return [section];
 const path=section.path||[];
 if(doc.id==='direction-123'){
  if(/^Part /.test(section.number||'')){const children=doc.sections.filter(s=>s.path?.includes(section.title));return [section,...children];}
  if(section.number){const descendants=doc.sections.filter(s=>s.id!==section.id&&s.number?.startsWith(section.number+'.'));return [section,...descendants];}
  return [section];
 }
 if(section.isHeading){const scope=path.at(-1)===section.title?path:[...path,section.title];const children=doc.sections.filter(s=>isReadable(s)&&inside(s.path,scope));if(children.length)return children;}
 const visaIndex=path.findIndex(p=>/^Subclass/.test(p));
 if(visaIndex>=0){const scope=path.slice(0,visaIndex+1);return doc.sections.filter(s=>isReadable(s)&&inside(s.path,scope));}
 return doc.sections.filter(s=>isReadable(s)&&s.path?.length===path.length&&inside(s.path,path));
}
