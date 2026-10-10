"use client";
import { useEffect } from "react";
/** Scroll after async forms mount; reveal a collapsed editor before focusing its field. */
export function focusLinkedSection() {
  let id:string;
  try{id=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
  if(!id)return;
  const target=document.getElementById(id);
  if(!target)return;
  const details=target.closest("details");
  if(details)details.open=true;
  target.scrollIntoView?.({block:"center"});
  const control=target.matches("input,select,textarea,button")?target:target.querySelector<HTMLElement>("input,select,textarea,button");
  control?.focus({preventScroll:true});
}
export function useLinkedSection(ready=true) {
  useEffect(()=>{
    if(!ready)return;
    focusLinkedSection();
    window.addEventListener("hashchange",focusLinkedSection);
    return()=>window.removeEventListener("hashchange",focusLinkedSection);
  },[ready]);
}
