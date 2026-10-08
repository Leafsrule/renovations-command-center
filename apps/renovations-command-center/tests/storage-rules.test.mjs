import {readFile} from 'node:fs/promises';
import {after,before,test} from 'node:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc} from 'firebase/firestore';
import {ref,uploadBytes,getBytes,deleteObject} from 'firebase/storage';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-renovations-racp',firestore:{rules:await readFile('firestore.rules','utf8')},storage:{rules:await readFile('storage.rules','utf8')}});await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'projects','owned'),{ownerUserId:'owner'});await setDoc(doc(c.firestore(),'projects','owned','tasks','task'),{status:'ready'});});});
after(async()=>{if(env)await env.cleanup()});
test('project owner may upload and read private image evidence',async()=>{const storage=env.authenticatedContext('owner').storage();const photo=ref(storage,'projects/owned/evidence-staging/photo1');await assertSucceeds(uploadBytes(photo,new Uint8Array([255,216,255]),{contentType:'image/jpeg',customMetadata:{taskId:'task',uploadedBy:'owner'}}));await assertSucceeds(getBytes(photo));});
test('other owners and anonymous users cannot read or write evidence',async()=>{for(const c of [env.authenticatedContext('other'),env.unauthenticatedContext()]){const storage=c.storage();await assertFails(getBytes(ref(storage,'projects/owned/evidence-staging/photo1')));await assertFails(uploadBytes(ref(storage,'projects/owned/evidence-staging/unauthorized'),new Uint8Array([1]),{contentType:'image/jpeg',customMetadata:{taskId:'task',uploadedBy:'owner'}}));}});
test('nonimage uploads and overwriting existing objects are rejected',async()=>{const storage=env.authenticatedContext('owner').storage();await assertFails(uploadBytes(ref(storage,'projects/owned/evidence-staging/text'),new Uint8Array([1]),{contentType:'text/plain'}));await assertFails(uploadBytes(ref(storage,'projects/owned/evidence-staging/photo1'),new Uint8Array([1]),{contentType:'image/jpeg',customMetadata:{taskId:'task',uploadedBy:'owner'}}));});

test('linked temporary evidence cannot be deleted from the SDK',async()=>{await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'projects','owned','evidence','photo1'),{taskId:'task'}));await assertFails(deleteObject(ref(env.authenticatedContext('owner').storage(),'projects/owned/evidence-staging/photo1')));});

test('final evidence objects cannot be created or overwritten by the SDK',async()=>{await assertFails(uploadBytes(ref(env.authenticatedContext('owner').storage(),'projects/owned/evidence/final-photo'),new Uint8Array([1]),{contentType:'image/jpeg',customMetadata:{taskId:'task',uploadedBy:'owner'}}));});
