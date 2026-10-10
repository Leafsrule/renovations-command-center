import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
const source = readFileSync("public/refresh-test-app.js", "utf8");
function fixture(hostname="localhost", fail=false) {
  let click: () => Promise<void> = async () => {};
  const button={disabled:false,addEventListener:(_name:string,handler:typeof click)=>{click=handler;}};
  const message={textContent:""};
  const unregister=vi.fn(async()=>{if(fail)throw Error("unavailable");return true;});
  const otherUnregister=vi.fn(async()=>true);
  const caches={keys:vi.fn(async()=>["rcc-public-shell-v1","other-app"]),delete:vi.fn(async()=>true)};
  const replace=vi.fn();
  const getRegistrations=vi.fn(async()=>[{active:{scriptURL:`http://${hostname}:3000/sw.js`},unregister},{active:{scriptURL:`http://${hostname}:3000/other-sw.js`},unregister:otherUnregister}]);
  const protectedStorage={clear:vi.fn(),removeItem:vi.fn()};
  runInNewContext(source,{document:{getElementById:(id:string)=>id==="refresh"?button:message},navigator:{serviceWorker:{getRegistrations}},window:{caches},caches,URL,location:{hostname,origin:`http://${hostname}:3000`,replace},localStorage:protectedStorage,indexedDB:protectedStorage});
  return {click:()=>click(),button,message,unregister,otherUnregister,caches,replace,getRegistrations,protectedStorage};
}
describe("refresh old local app bundles without removing test data",()=>{
  it("removes only this app's worker/cache and preserves unrelated caches and stored data",async()=>{
    const f=fixture();await f.click();expect(f.unregister).toHaveBeenCalledOnce();expect(f.otherUnregister).not.toHaveBeenCalled();expect(f.caches.delete).toHaveBeenCalledExactlyOnceWith("rcc-public-shell-v1");expect(f.protectedStorage.clear).not.toHaveBeenCalled();expect(f.protectedStorage.removeItem).not.toHaveBeenCalled();expect(f.replace).toHaveBeenCalledWith("/projects");
  });
  it("does not redirect on cleanup failure and permits retry",async()=>{
    const f=fixture("localhost",true);await f.click();expect(f.replace).not.toHaveBeenCalled();expect(f.button.disabled).toBe(false);expect(f.message.textContent).toMatch(/could not finish/);
  });
  it("refuses cleanup outside a local test host",async()=>{
    const f=fixture("example.com");await f.click();expect(f.getRegistrations).not.toHaveBeenCalled();expect(f.caches.keys).not.toHaveBeenCalled();expect(f.replace).not.toHaveBeenCalled();
  });
});
