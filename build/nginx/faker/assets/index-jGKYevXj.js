(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();function qE(n){return n&&n.__esModule&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n}var Ay={exports:{}},Ld={},Cy={exports:{}},lt={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var sc=Symbol.for("react.element"),$E=Symbol.for("react.portal"),KE=Symbol.for("react.fragment"),ZE=Symbol.for("react.strict_mode"),jE=Symbol.for("react.profiler"),QE=Symbol.for("react.provider"),JE=Symbol.for("react.context"),eT=Symbol.for("react.forward_ref"),tT=Symbol.for("react.suspense"),nT=Symbol.for("react.memo"),iT=Symbol.for("react.lazy"),S_=Symbol.iterator;function rT(n){return n===null||typeof n!="object"?null:(n=S_&&n[S_]||n["@@iterator"],typeof n=="function"?n:null)}var Ry={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},by=Object.assign,Py={};function Tl(n,e,t){this.props=n,this.context=e,this.refs=Py,this.updater=t||Ry}Tl.prototype.isReactComponent={};Tl.prototype.setState=function(n,e){if(typeof n!="object"&&typeof n!="function"&&n!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,n,e,"setState")};Tl.prototype.forceUpdate=function(n){this.updater.enqueueForceUpdate(this,n,"forceUpdate")};function Dy(){}Dy.prototype=Tl.prototype;function Og(n,e,t){this.props=n,this.context=e,this.refs=Py,this.updater=t||Ry}var kg=Og.prototype=new Dy;kg.constructor=Og;by(kg,Tl.prototype);kg.isPureReactComponent=!0;var M_=Array.isArray,Ly=Object.prototype.hasOwnProperty,Bg={current:null},Ny={key:!0,ref:!0,__self:!0,__source:!0};function Iy(n,e,t){var i,r={},s=null,a=null;if(e!=null)for(i in e.ref!==void 0&&(a=e.ref),e.key!==void 0&&(s=""+e.key),e)Ly.call(e,i)&&!Ny.hasOwnProperty(i)&&(r[i]=e[i]);var o=arguments.length-2;if(o===1)r.children=t;else if(1<o){for(var l=Array(o),u=0;u<o;u++)l[u]=arguments[u+2];r.children=l}if(n&&n.defaultProps)for(i in o=n.defaultProps,o)r[i]===void 0&&(r[i]=o[i]);return{$$typeof:sc,type:n,key:s,ref:a,props:r,_owner:Bg.current}}function sT(n,e){return{$$typeof:sc,type:n.type,key:e,ref:n.ref,props:n.props,_owner:n._owner}}function zg(n){return typeof n=="object"&&n!==null&&n.$$typeof===sc}function aT(n){var e={"=":"=0",":":"=2"};return"$"+n.replace(/[=:]/g,function(t){return e[t]})}var E_=/\/+/g;function nh(n,e){return typeof n=="object"&&n!==null&&n.key!=null?aT(""+n.key):e.toString(36)}function gf(n,e,t,i,r){var s=typeof n;(s==="undefined"||s==="boolean")&&(n=null);var a=!1;if(n===null)a=!0;else switch(s){case"string":case"number":a=!0;break;case"object":switch(n.$$typeof){case sc:case $E:a=!0}}if(a)return a=n,r=r(a),n=i===""?"."+nh(a,0):i,M_(r)?(t="",n!=null&&(t=n.replace(E_,"$&/")+"/"),gf(r,e,t,"",function(u){return u})):r!=null&&(zg(r)&&(r=sT(r,t+(!r.key||a&&a.key===r.key?"":(""+r.key).replace(E_,"$&/")+"/")+n)),e.push(r)),1;if(a=0,i=i===""?".":i+":",M_(n))for(var o=0;o<n.length;o++){s=n[o];var l=i+nh(s,o);a+=gf(s,e,t,l,r)}else if(l=rT(n),typeof l=="function")for(n=l.call(n),o=0;!(s=n.next()).done;)s=s.value,l=i+nh(s,o++),a+=gf(s,e,t,l,r);else if(s==="object")throw e=String(n),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(n).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return a}function mc(n,e,t){if(n==null)return n;var i=[],r=0;return gf(n,i,"","",function(s){return e.call(t,s,r++)}),i}function oT(n){if(n._status===-1){var e=n._result;e=e(),e.then(function(t){(n._status===0||n._status===-1)&&(n._status=1,n._result=t)},function(t){(n._status===0||n._status===-1)&&(n._status=2,n._result=t)}),n._status===-1&&(n._status=0,n._result=e)}if(n._status===1)return n._result.default;throw n._result}var oi={current:null},_f={transition:null},lT={ReactCurrentDispatcher:oi,ReactCurrentBatchConfig:_f,ReactCurrentOwner:Bg};function Uy(){throw Error("act(...) is not supported in production builds of React.")}lt.Children={map:mc,forEach:function(n,e,t){mc(n,function(){e.apply(this,arguments)},t)},count:function(n){var e=0;return mc(n,function(){e++}),e},toArray:function(n){return mc(n,function(e){return e})||[]},only:function(n){if(!zg(n))throw Error("React.Children.only expected to receive a single React element child.");return n}};lt.Component=Tl;lt.Fragment=KE;lt.Profiler=jE;lt.PureComponent=Og;lt.StrictMode=ZE;lt.Suspense=tT;lt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=lT;lt.act=Uy;lt.cloneElement=function(n,e,t){if(n==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+n+".");var i=by({},n.props),r=n.key,s=n.ref,a=n._owner;if(e!=null){if(e.ref!==void 0&&(s=e.ref,a=Bg.current),e.key!==void 0&&(r=""+e.key),n.type&&n.type.defaultProps)var o=n.type.defaultProps;for(l in e)Ly.call(e,l)&&!Ny.hasOwnProperty(l)&&(i[l]=e[l]===void 0&&o!==void 0?o[l]:e[l])}var l=arguments.length-2;if(l===1)i.children=t;else if(1<l){o=Array(l);for(var u=0;u<l;u++)o[u]=arguments[u+2];i.children=o}return{$$typeof:sc,type:n.type,key:r,ref:s,props:i,_owner:a}};lt.createContext=function(n){return n={$$typeof:JE,_currentValue:n,_currentValue2:n,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},n.Provider={$$typeof:QE,_context:n},n.Consumer=n};lt.createElement=Iy;lt.createFactory=function(n){var e=Iy.bind(null,n);return e.type=n,e};lt.createRef=function(){return{current:null}};lt.forwardRef=function(n){return{$$typeof:eT,render:n}};lt.isValidElement=zg;lt.lazy=function(n){return{$$typeof:iT,_payload:{_status:-1,_result:n},_init:oT}};lt.memo=function(n,e){return{$$typeof:nT,type:n,compare:e===void 0?null:e}};lt.startTransition=function(n){var e=_f.transition;_f.transition={};try{n()}finally{_f.transition=e}};lt.unstable_act=Uy;lt.useCallback=function(n,e){return oi.current.useCallback(n,e)};lt.useContext=function(n){return oi.current.useContext(n)};lt.useDebugValue=function(){};lt.useDeferredValue=function(n){return oi.current.useDeferredValue(n)};lt.useEffect=function(n,e){return oi.current.useEffect(n,e)};lt.useId=function(){return oi.current.useId()};lt.useImperativeHandle=function(n,e,t){return oi.current.useImperativeHandle(n,e,t)};lt.useInsertionEffect=function(n,e){return oi.current.useInsertionEffect(n,e)};lt.useLayoutEffect=function(n,e){return oi.current.useLayoutEffect(n,e)};lt.useMemo=function(n,e){return oi.current.useMemo(n,e)};lt.useReducer=function(n,e,t){return oi.current.useReducer(n,e,t)};lt.useRef=function(n){return oi.current.useRef(n)};lt.useState=function(n){return oi.current.useState(n)};lt.useSyncExternalStore=function(n,e,t){return oi.current.useSyncExternalStore(n,e,t)};lt.useTransition=function(){return oi.current.useTransition()};lt.version="18.3.1";Cy.exports=lt;var Ye=Cy.exports;const uT=qE(Ye);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var cT=Ye,fT=Symbol.for("react.element"),dT=Symbol.for("react.fragment"),hT=Object.prototype.hasOwnProperty,pT=cT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,mT={key:!0,ref:!0,__self:!0,__source:!0};function Fy(n,e,t){var i,r={},s=null,a=null;t!==void 0&&(s=""+t),e.key!==void 0&&(s=""+e.key),e.ref!==void 0&&(a=e.ref);for(i in e)hT.call(e,i)&&!mT.hasOwnProperty(i)&&(r[i]=e[i]);if(n&&n.defaultProps)for(i in e=n.defaultProps,e)r[i]===void 0&&(r[i]=e[i]);return{$$typeof:fT,type:n,key:s,ref:a,props:r,_owner:pT.current}}Ld.Fragment=dT;Ld.jsx=Fy;Ld.jsxs=Fy;Ay.exports=Ld;var j=Ay.exports,Rp={},Oy={exports:{}},Gi={},ky={exports:{}},By={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(n){function e(N,O){var b=N.length;N.push(O);e:for(;0<b;){var Q=b-1>>>1,te=N[Q];if(0<r(te,O))N[Q]=O,N[b]=te,b=Q;else break e}}function t(N){return N.length===0?null:N[0]}function i(N){if(N.length===0)return null;var O=N[0],b=N.pop();if(b!==O){N[0]=b;e:for(var Q=0,te=N.length,Oe=te>>>1;Q<Oe;){var be=2*(Q+1)-1,Ce=N[be],$=be+1,se=N[$];if(0>r(Ce,b))$<te&&0>r(se,Ce)?(N[Q]=se,N[$]=b,Q=$):(N[Q]=Ce,N[be]=b,Q=be);else if($<te&&0>r(se,b))N[Q]=se,N[$]=b,Q=$;else break e}}return O}function r(N,O){var b=N.sortIndex-O.sortIndex;return b!==0?b:N.id-O.id}if(typeof performance=="object"&&typeof performance.now=="function"){var s=performance;n.unstable_now=function(){return s.now()}}else{var a=Date,o=a.now();n.unstable_now=function(){return a.now()-o}}var l=[],u=[],c=1,d=null,f=3,h=!1,m=!1,_=!1,g=typeof setTimeout=="function"?setTimeout:null,p=typeof clearTimeout=="function"?clearTimeout:null,v=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function S(N){for(var O=t(u);O!==null;){if(O.callback===null)i(u);else if(O.startTime<=N)i(u),O.sortIndex=O.expirationTime,e(l,O);else break;O=t(u)}}function x(N){if(_=!1,S(N),!m)if(t(l)!==null)m=!0,G(E);else{var O=t(u);O!==null&&U(x,O.startTime-N)}}function E(N,O){m=!1,_&&(_=!1,p(y),y=-1),h=!0;var b=f;try{for(S(O),d=t(l);d!==null&&(!(d.expirationTime>O)||N&&!D());){var Q=d.callback;if(typeof Q=="function"){d.callback=null,f=d.priorityLevel;var te=Q(d.expirationTime<=O);O=n.unstable_now(),typeof te=="function"?d.callback=te:d===t(l)&&i(l),S(O)}else i(l);d=t(l)}if(d!==null)var Oe=!0;else{var be=t(u);be!==null&&U(x,be.startTime-O),Oe=!1}return Oe}finally{d=null,f=b,h=!1}}var T=!1,w=null,y=-1,A=5,R=-1;function D(){return!(n.unstable_now()-R<A)}function L(){if(w!==null){var N=n.unstable_now();R=N;var O=!0;try{O=w(!0,N)}finally{O?z():(T=!1,w=null)}}else T=!1}var z;if(typeof v=="function")z=function(){v(L)};else if(typeof MessageChannel<"u"){var I=new MessageChannel,F=I.port2;I.port1.onmessage=L,z=function(){F.postMessage(null)}}else z=function(){g(L,0)};function G(N){w=N,T||(T=!0,z())}function U(N,O){y=g(function(){N(n.unstable_now())},O)}n.unstable_IdlePriority=5,n.unstable_ImmediatePriority=1,n.unstable_LowPriority=4,n.unstable_NormalPriority=3,n.unstable_Profiling=null,n.unstable_UserBlockingPriority=2,n.unstable_cancelCallback=function(N){N.callback=null},n.unstable_continueExecution=function(){m||h||(m=!0,G(E))},n.unstable_forceFrameRate=function(N){0>N||125<N?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):A=0<N?Math.floor(1e3/N):5},n.unstable_getCurrentPriorityLevel=function(){return f},n.unstable_getFirstCallbackNode=function(){return t(l)},n.unstable_next=function(N){switch(f){case 1:case 2:case 3:var O=3;break;default:O=f}var b=f;f=O;try{return N()}finally{f=b}},n.unstable_pauseExecution=function(){},n.unstable_requestPaint=function(){},n.unstable_runWithPriority=function(N,O){switch(N){case 1:case 2:case 3:case 4:case 5:break;default:N=3}var b=f;f=N;try{return O()}finally{f=b}},n.unstable_scheduleCallback=function(N,O,b){var Q=n.unstable_now();switch(typeof b=="object"&&b!==null?(b=b.delay,b=typeof b=="number"&&0<b?Q+b:Q):b=Q,N){case 1:var te=-1;break;case 2:te=250;break;case 5:te=1073741823;break;case 4:te=1e4;break;default:te=5e3}return te=b+te,N={id:c++,callback:O,priorityLevel:N,startTime:b,expirationTime:te,sortIndex:-1},b>Q?(N.sortIndex=b,e(u,N),t(l)===null&&N===t(u)&&(_?(p(y),y=-1):_=!0,U(x,b-Q))):(N.sortIndex=te,e(l,N),m||h||(m=!0,G(E))),N},n.unstable_shouldYield=D,n.unstable_wrapCallback=function(N){var O=f;return function(){var b=f;f=O;try{return N.apply(this,arguments)}finally{f=b}}}})(By);ky.exports=By;var gT=ky.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var _T=Ye,zi=gT;function fe(n){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+n,t=1;t<arguments.length;t++)e+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+n+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var zy=new Set,bu={};function eo(n,e){ol(n,e),ol(n+"Capture",e)}function ol(n,e){for(bu[n]=e,n=0;n<e.length;n++)zy.add(e[n])}var ds=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),bp=Object.prototype.hasOwnProperty,vT=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,T_={},w_={};function xT(n){return bp.call(w_,n)?!0:bp.call(T_,n)?!1:vT.test(n)?w_[n]=!0:(T_[n]=!0,!1)}function yT(n,e,t,i){if(t!==null&&t.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return i?!1:t!==null?!t.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function ST(n,e,t,i){if(e===null||typeof e>"u"||yT(n,e,t,i))return!0;if(i)return!1;if(t!==null)switch(t.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function li(n,e,t,i,r,s,a){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=i,this.attributeNamespace=r,this.mustUseProperty=t,this.propertyName=n,this.type=e,this.sanitizeURL=s,this.removeEmptyString=a}var In={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){In[n]=new li(n,0,!1,n,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var e=n[0];In[e]=new li(e,1,!1,n[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(n){In[n]=new li(n,2,!1,n.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){In[n]=new li(n,2,!1,n,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){In[n]=new li(n,3,!1,n.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(n){In[n]=new li(n,3,!0,n,null,!1,!1)});["capture","download"].forEach(function(n){In[n]=new li(n,4,!1,n,null,!1,!1)});["cols","rows","size","span"].forEach(function(n){In[n]=new li(n,6,!1,n,null,!1,!1)});["rowSpan","start"].forEach(function(n){In[n]=new li(n,5,!1,n.toLowerCase(),null,!1,!1)});var Vg=/[\-:]([a-z])/g;function Hg(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var e=n.replace(Vg,Hg);In[e]=new li(e,1,!1,n,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var e=n.replace(Vg,Hg);In[e]=new li(e,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(n){var e=n.replace(Vg,Hg);In[e]=new li(e,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(n){In[n]=new li(n,1,!1,n.toLowerCase(),null,!1,!1)});In.xlinkHref=new li("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(n){In[n]=new li(n,1,!1,n.toLowerCase(),null,!0,!0)});function Gg(n,e,t,i){var r=In.hasOwnProperty(e)?In[e]:null;(r!==null?r.type!==0:i||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(ST(e,t,r,i)&&(t=null),i||r===null?xT(e)&&(t===null?n.removeAttribute(e):n.setAttribute(e,""+t)):r.mustUseProperty?n[r.propertyName]=t===null?r.type===3?!1:"":t:(e=r.attributeName,i=r.attributeNamespace,t===null?n.removeAttribute(e):(r=r.type,t=r===3||r===4&&t===!0?"":""+t,i?n.setAttributeNS(i,e,t):n.setAttribute(e,t))))}var ys=_T.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,gc=Symbol.for("react.element"),Po=Symbol.for("react.portal"),Do=Symbol.for("react.fragment"),Wg=Symbol.for("react.strict_mode"),Pp=Symbol.for("react.profiler"),Vy=Symbol.for("react.provider"),Hy=Symbol.for("react.context"),Xg=Symbol.for("react.forward_ref"),Dp=Symbol.for("react.suspense"),Lp=Symbol.for("react.suspense_list"),Yg=Symbol.for("react.memo"),Ns=Symbol.for("react.lazy"),Gy=Symbol.for("react.offscreen"),A_=Symbol.iterator;function bl(n){return n===null||typeof n!="object"?null:(n=A_&&n[A_]||n["@@iterator"],typeof n=="function"?n:null)}var Xt=Object.assign,ih;function $l(n){if(ih===void 0)try{throw Error()}catch(t){var e=t.stack.trim().match(/\n( *(at )?)/);ih=e&&e[1]||""}return`
`+ih+n}var rh=!1;function sh(n,e){if(!n||rh)return"";rh=!0;var t=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(u){var i=u}Reflect.construct(n,[],e)}else{try{e.call()}catch(u){i=u}n.call(e.prototype)}else{try{throw Error()}catch(u){i=u}n()}}catch(u){if(u&&i&&typeof u.stack=="string"){for(var r=u.stack.split(`
`),s=i.stack.split(`
`),a=r.length-1,o=s.length-1;1<=a&&0<=o&&r[a]!==s[o];)o--;for(;1<=a&&0<=o;a--,o--)if(r[a]!==s[o]){if(a!==1||o!==1)do if(a--,o--,0>o||r[a]!==s[o]){var l=`
`+r[a].replace(" at new "," at ");return n.displayName&&l.includes("<anonymous>")&&(l=l.replace("<anonymous>",n.displayName)),l}while(1<=a&&0<=o);break}}}finally{rh=!1,Error.prepareStackTrace=t}return(n=n?n.displayName||n.name:"")?$l(n):""}function MT(n){switch(n.tag){case 5:return $l(n.type);case 16:return $l("Lazy");case 13:return $l("Suspense");case 19:return $l("SuspenseList");case 0:case 2:case 15:return n=sh(n.type,!1),n;case 11:return n=sh(n.type.render,!1),n;case 1:return n=sh(n.type,!0),n;default:return""}}function Np(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case Do:return"Fragment";case Po:return"Portal";case Pp:return"Profiler";case Wg:return"StrictMode";case Dp:return"Suspense";case Lp:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case Hy:return(n.displayName||"Context")+".Consumer";case Vy:return(n._context.displayName||"Context")+".Provider";case Xg:var e=n.render;return n=n.displayName,n||(n=e.displayName||e.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case Yg:return e=n.displayName||null,e!==null?e:Np(n.type)||"Memo";case Ns:e=n._payload,n=n._init;try{return Np(n(e))}catch{}}return null}function ET(n){var e=n.type;switch(n.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=e.render,n=n.displayName||n.name||"",e.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Np(e);case 8:return e===Wg?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function ia(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function Wy(n){var e=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function TT(n){var e=Wy(n)?"checked":"value",t=Object.getOwnPropertyDescriptor(n.constructor.prototype,e),i=""+n[e];if(!n.hasOwnProperty(e)&&typeof t<"u"&&typeof t.get=="function"&&typeof t.set=="function"){var r=t.get,s=t.set;return Object.defineProperty(n,e,{configurable:!0,get:function(){return r.call(this)},set:function(a){i=""+a,s.call(this,a)}}),Object.defineProperty(n,e,{enumerable:t.enumerable}),{getValue:function(){return i},setValue:function(a){i=""+a},stopTracking:function(){n._valueTracker=null,delete n[e]}}}}function _c(n){n._valueTracker||(n._valueTracker=TT(n))}function Xy(n){if(!n)return!1;var e=n._valueTracker;if(!e)return!0;var t=e.getValue(),i="";return n&&(i=Wy(n)?n.checked?"true":"false":n.value),n=i,n!==t?(e.setValue(n),!0):!1}function Gf(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function Ip(n,e){var t=e.checked;return Xt({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:t??n._wrapperState.initialChecked})}function C_(n,e){var t=e.defaultValue==null?"":e.defaultValue,i=e.checked!=null?e.checked:e.defaultChecked;t=ia(e.value!=null?e.value:t),n._wrapperState={initialChecked:i,initialValue:t,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function Yy(n,e){e=e.checked,e!=null&&Gg(n,"checked",e,!1)}function Up(n,e){Yy(n,e);var t=ia(e.value),i=e.type;if(t!=null)i==="number"?(t===0&&n.value===""||n.value!=t)&&(n.value=""+t):n.value!==""+t&&(n.value=""+t);else if(i==="submit"||i==="reset"){n.removeAttribute("value");return}e.hasOwnProperty("value")?Fp(n,e.type,t):e.hasOwnProperty("defaultValue")&&Fp(n,e.type,ia(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(n.defaultChecked=!!e.defaultChecked)}function R_(n,e,t){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var i=e.type;if(!(i!=="submit"&&i!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+n._wrapperState.initialValue,t||e===n.value||(n.value=e),n.defaultValue=e}t=n.name,t!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,t!==""&&(n.name=t)}function Fp(n,e,t){(e!=="number"||Gf(n.ownerDocument)!==n)&&(t==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+t&&(n.defaultValue=""+t))}var Kl=Array.isArray;function Xo(n,e,t,i){if(n=n.options,e){e={};for(var r=0;r<t.length;r++)e["$"+t[r]]=!0;for(t=0;t<n.length;t++)r=e.hasOwnProperty("$"+n[t].value),n[t].selected!==r&&(n[t].selected=r),r&&i&&(n[t].defaultSelected=!0)}else{for(t=""+ia(t),e=null,r=0;r<n.length;r++){if(n[r].value===t){n[r].selected=!0,i&&(n[r].defaultSelected=!0);return}e!==null||n[r].disabled||(e=n[r])}e!==null&&(e.selected=!0)}}function Op(n,e){if(e.dangerouslySetInnerHTML!=null)throw Error(fe(91));return Xt({},e,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function b_(n,e){var t=e.value;if(t==null){if(t=e.children,e=e.defaultValue,t!=null){if(e!=null)throw Error(fe(92));if(Kl(t)){if(1<t.length)throw Error(fe(93));t=t[0]}e=t}e==null&&(e=""),t=e}n._wrapperState={initialValue:ia(t)}}function qy(n,e){var t=ia(e.value),i=ia(e.defaultValue);t!=null&&(t=""+t,t!==n.value&&(n.value=t),e.defaultValue==null&&n.defaultValue!==t&&(n.defaultValue=t)),i!=null&&(n.defaultValue=""+i)}function P_(n){var e=n.textContent;e===n._wrapperState.initialValue&&e!==""&&e!==null&&(n.value=e)}function $y(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function kp(n,e){return n==null||n==="http://www.w3.org/1999/xhtml"?$y(e):n==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var vc,Ky=function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,t,i,r){MSApp.execUnsafeLocalFunction(function(){return n(e,t,i,r)})}:n}(function(n,e){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=e;else{for(vc=vc||document.createElement("div"),vc.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=vc.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;e.firstChild;)n.appendChild(e.firstChild)}});function Pu(n,e){if(e){var t=n.firstChild;if(t&&t===n.lastChild&&t.nodeType===3){t.nodeValue=e;return}}n.textContent=e}var ou={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},wT=["Webkit","ms","Moz","O"];Object.keys(ou).forEach(function(n){wT.forEach(function(e){e=e+n.charAt(0).toUpperCase()+n.substring(1),ou[e]=ou[n]})});function Zy(n,e,t){return e==null||typeof e=="boolean"||e===""?"":t||typeof e!="number"||e===0||ou.hasOwnProperty(n)&&ou[n]?(""+e).trim():e+"px"}function jy(n,e){n=n.style;for(var t in e)if(e.hasOwnProperty(t)){var i=t.indexOf("--")===0,r=Zy(t,e[t],i);t==="float"&&(t="cssFloat"),i?n.setProperty(t,r):n[t]=r}}var AT=Xt({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Bp(n,e){if(e){if(AT[n]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(fe(137,n));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(fe(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(fe(61))}if(e.style!=null&&typeof e.style!="object")throw Error(fe(62))}}function zp(n,e){if(n.indexOf("-")===-1)return typeof e.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Vp=null;function qg(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var Hp=null,Yo=null,qo=null;function D_(n){if(n=lc(n)){if(typeof Hp!="function")throw Error(fe(280));var e=n.stateNode;e&&(e=Od(e),Hp(n.stateNode,n.type,e))}}function Qy(n){Yo?qo?qo.push(n):qo=[n]:Yo=n}function Jy(){if(Yo){var n=Yo,e=qo;if(qo=Yo=null,D_(n),e)for(n=0;n<e.length;n++)D_(e[n])}}function e1(n,e){return n(e)}function t1(){}var ah=!1;function n1(n,e,t){if(ah)return n(e,t);ah=!0;try{return e1(n,e,t)}finally{ah=!1,(Yo!==null||qo!==null)&&(t1(),Jy())}}function Du(n,e){var t=n.stateNode;if(t===null)return null;var i=Od(t);if(i===null)return null;t=i[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(i=!i.disabled)||(n=n.type,i=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!i;break e;default:n=!1}if(n)return null;if(t&&typeof t!="function")throw Error(fe(231,e,typeof t));return t}var Gp=!1;if(ds)try{var Pl={};Object.defineProperty(Pl,"passive",{get:function(){Gp=!0}}),window.addEventListener("test",Pl,Pl),window.removeEventListener("test",Pl,Pl)}catch{Gp=!1}function CT(n,e,t,i,r,s,a,o,l){var u=Array.prototype.slice.call(arguments,3);try{e.apply(t,u)}catch(c){this.onError(c)}}var lu=!1,Wf=null,Xf=!1,Wp=null,RT={onError:function(n){lu=!0,Wf=n}};function bT(n,e,t,i,r,s,a,o,l){lu=!1,Wf=null,CT.apply(RT,arguments)}function PT(n,e,t,i,r,s,a,o,l){if(bT.apply(this,arguments),lu){if(lu){var u=Wf;lu=!1,Wf=null}else throw Error(fe(198));Xf||(Xf=!0,Wp=u)}}function to(n){var e=n,t=n;if(n.alternate)for(;e.return;)e=e.return;else{n=e;do e=n,e.flags&4098&&(t=e.return),n=e.return;while(n)}return e.tag===3?t:null}function i1(n){if(n.tag===13){var e=n.memoizedState;if(e===null&&(n=n.alternate,n!==null&&(e=n.memoizedState)),e!==null)return e.dehydrated}return null}function L_(n){if(to(n)!==n)throw Error(fe(188))}function DT(n){var e=n.alternate;if(!e){if(e=to(n),e===null)throw Error(fe(188));return e!==n?null:n}for(var t=n,i=e;;){var r=t.return;if(r===null)break;var s=r.alternate;if(s===null){if(i=r.return,i!==null){t=i;continue}break}if(r.child===s.child){for(s=r.child;s;){if(s===t)return L_(r),n;if(s===i)return L_(r),e;s=s.sibling}throw Error(fe(188))}if(t.return!==i.return)t=r,i=s;else{for(var a=!1,o=r.child;o;){if(o===t){a=!0,t=r,i=s;break}if(o===i){a=!0,i=r,t=s;break}o=o.sibling}if(!a){for(o=s.child;o;){if(o===t){a=!0,t=s,i=r;break}if(o===i){a=!0,i=s,t=r;break}o=o.sibling}if(!a)throw Error(fe(189))}}if(t.alternate!==i)throw Error(fe(190))}if(t.tag!==3)throw Error(fe(188));return t.stateNode.current===t?n:e}function r1(n){return n=DT(n),n!==null?s1(n):null}function s1(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var e=s1(n);if(e!==null)return e;n=n.sibling}return null}var a1=zi.unstable_scheduleCallback,N_=zi.unstable_cancelCallback,LT=zi.unstable_shouldYield,NT=zi.unstable_requestPaint,nn=zi.unstable_now,IT=zi.unstable_getCurrentPriorityLevel,$g=zi.unstable_ImmediatePriority,o1=zi.unstable_UserBlockingPriority,Yf=zi.unstable_NormalPriority,UT=zi.unstable_LowPriority,l1=zi.unstable_IdlePriority,Nd=null,Or=null;function FT(n){if(Or&&typeof Or.onCommitFiberRoot=="function")try{Or.onCommitFiberRoot(Nd,n,void 0,(n.current.flags&128)===128)}catch{}}var vr=Math.clz32?Math.clz32:BT,OT=Math.log,kT=Math.LN2;function BT(n){return n>>>=0,n===0?32:31-(OT(n)/kT|0)|0}var xc=64,yc=4194304;function Zl(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function qf(n,e){var t=n.pendingLanes;if(t===0)return 0;var i=0,r=n.suspendedLanes,s=n.pingedLanes,a=t&268435455;if(a!==0){var o=a&~r;o!==0?i=Zl(o):(s&=a,s!==0&&(i=Zl(s)))}else a=t&~r,a!==0?i=Zl(a):s!==0&&(i=Zl(s));if(i===0)return 0;if(e!==0&&e!==i&&!(e&r)&&(r=i&-i,s=e&-e,r>=s||r===16&&(s&4194240)!==0))return e;if(i&4&&(i|=t&16),e=n.entangledLanes,e!==0)for(n=n.entanglements,e&=i;0<e;)t=31-vr(e),r=1<<t,i|=n[t],e&=~r;return i}function zT(n,e){switch(n){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function VT(n,e){for(var t=n.suspendedLanes,i=n.pingedLanes,r=n.expirationTimes,s=n.pendingLanes;0<s;){var a=31-vr(s),o=1<<a,l=r[a];l===-1?(!(o&t)||o&i)&&(r[a]=zT(o,e)):l<=e&&(n.expiredLanes|=o),s&=~o}}function Xp(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function u1(){var n=xc;return xc<<=1,!(xc&4194240)&&(xc=64),n}function oh(n){for(var e=[],t=0;31>t;t++)e.push(n);return e}function ac(n,e,t){n.pendingLanes|=e,e!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,e=31-vr(e),n[e]=t}function HT(n,e){var t=n.pendingLanes&~e;n.pendingLanes=e,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=e,n.mutableReadLanes&=e,n.entangledLanes&=e,e=n.entanglements;var i=n.eventTimes;for(n=n.expirationTimes;0<t;){var r=31-vr(t),s=1<<r;e[r]=0,i[r]=-1,n[r]=-1,t&=~s}}function Kg(n,e){var t=n.entangledLanes|=e;for(n=n.entanglements;t;){var i=31-vr(t),r=1<<i;r&e|n[i]&e&&(n[i]|=e),t&=~r}}var Et=0;function c1(n){return n&=-n,1<n?4<n?n&268435455?16:536870912:4:1}var f1,Zg,d1,h1,p1,Yp=!1,Sc=[],Ys=null,qs=null,$s=null,Lu=new Map,Nu=new Map,Us=[],GT="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function I_(n,e){switch(n){case"focusin":case"focusout":Ys=null;break;case"dragenter":case"dragleave":qs=null;break;case"mouseover":case"mouseout":$s=null;break;case"pointerover":case"pointerout":Lu.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":Nu.delete(e.pointerId)}}function Dl(n,e,t,i,r,s){return n===null||n.nativeEvent!==s?(n={blockedOn:e,domEventName:t,eventSystemFlags:i,nativeEvent:s,targetContainers:[r]},e!==null&&(e=lc(e),e!==null&&Zg(e)),n):(n.eventSystemFlags|=i,e=n.targetContainers,r!==null&&e.indexOf(r)===-1&&e.push(r),n)}function WT(n,e,t,i,r){switch(e){case"focusin":return Ys=Dl(Ys,n,e,t,i,r),!0;case"dragenter":return qs=Dl(qs,n,e,t,i,r),!0;case"mouseover":return $s=Dl($s,n,e,t,i,r),!0;case"pointerover":var s=r.pointerId;return Lu.set(s,Dl(Lu.get(s)||null,n,e,t,i,r)),!0;case"gotpointercapture":return s=r.pointerId,Nu.set(s,Dl(Nu.get(s)||null,n,e,t,i,r)),!0}return!1}function m1(n){var e=Ra(n.target);if(e!==null){var t=to(e);if(t!==null){if(e=t.tag,e===13){if(e=i1(t),e!==null){n.blockedOn=e,p1(n.priority,function(){d1(t)});return}}else if(e===3&&t.stateNode.current.memoizedState.isDehydrated){n.blockedOn=t.tag===3?t.stateNode.containerInfo:null;return}}}n.blockedOn=null}function vf(n){if(n.blockedOn!==null)return!1;for(var e=n.targetContainers;0<e.length;){var t=qp(n.domEventName,n.eventSystemFlags,e[0],n.nativeEvent);if(t===null){t=n.nativeEvent;var i=new t.constructor(t.type,t);Vp=i,t.target.dispatchEvent(i),Vp=null}else return e=lc(t),e!==null&&Zg(e),n.blockedOn=t,!1;e.shift()}return!0}function U_(n,e,t){vf(n)&&t.delete(e)}function XT(){Yp=!1,Ys!==null&&vf(Ys)&&(Ys=null),qs!==null&&vf(qs)&&(qs=null),$s!==null&&vf($s)&&($s=null),Lu.forEach(U_),Nu.forEach(U_)}function Ll(n,e){n.blockedOn===e&&(n.blockedOn=null,Yp||(Yp=!0,zi.unstable_scheduleCallback(zi.unstable_NormalPriority,XT)))}function Iu(n){function e(r){return Ll(r,n)}if(0<Sc.length){Ll(Sc[0],n);for(var t=1;t<Sc.length;t++){var i=Sc[t];i.blockedOn===n&&(i.blockedOn=null)}}for(Ys!==null&&Ll(Ys,n),qs!==null&&Ll(qs,n),$s!==null&&Ll($s,n),Lu.forEach(e),Nu.forEach(e),t=0;t<Us.length;t++)i=Us[t],i.blockedOn===n&&(i.blockedOn=null);for(;0<Us.length&&(t=Us[0],t.blockedOn===null);)m1(t),t.blockedOn===null&&Us.shift()}var $o=ys.ReactCurrentBatchConfig,$f=!0;function YT(n,e,t,i){var r=Et,s=$o.transition;$o.transition=null;try{Et=1,jg(n,e,t,i)}finally{Et=r,$o.transition=s}}function qT(n,e,t,i){var r=Et,s=$o.transition;$o.transition=null;try{Et=4,jg(n,e,t,i)}finally{Et=r,$o.transition=s}}function jg(n,e,t,i){if($f){var r=qp(n,e,t,i);if(r===null)_h(n,e,i,Kf,t),I_(n,i);else if(WT(r,n,e,t,i))i.stopPropagation();else if(I_(n,i),e&4&&-1<GT.indexOf(n)){for(;r!==null;){var s=lc(r);if(s!==null&&f1(s),s=qp(n,e,t,i),s===null&&_h(n,e,i,Kf,t),s===r)break;r=s}r!==null&&i.stopPropagation()}else _h(n,e,i,null,t)}}var Kf=null;function qp(n,e,t,i){if(Kf=null,n=qg(i),n=Ra(n),n!==null)if(e=to(n),e===null)n=null;else if(t=e.tag,t===13){if(n=i1(e),n!==null)return n;n=null}else if(t===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;n=null}else e!==n&&(n=null);return Kf=n,null}function g1(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(IT()){case $g:return 1;case o1:return 4;case Yf:case UT:return 16;case l1:return 536870912;default:return 16}default:return 16}}var ks=null,Qg=null,xf=null;function _1(){if(xf)return xf;var n,e=Qg,t=e.length,i,r="value"in ks?ks.value:ks.textContent,s=r.length;for(n=0;n<t&&e[n]===r[n];n++);var a=t-n;for(i=1;i<=a&&e[t-i]===r[s-i];i++);return xf=r.slice(n,1<i?1-i:void 0)}function yf(n){var e=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&e===13&&(n=13)):n=e,n===10&&(n=13),32<=n||n===13?n:0}function Mc(){return!0}function F_(){return!1}function Wi(n){function e(t,i,r,s,a){this._reactName=t,this._targetInst=r,this.type=i,this.nativeEvent=s,this.target=a,this.currentTarget=null;for(var o in n)n.hasOwnProperty(o)&&(t=n[o],this[o]=t?t(s):s[o]);return this.isDefaultPrevented=(s.defaultPrevented!=null?s.defaultPrevented:s.returnValue===!1)?Mc:F_,this.isPropagationStopped=F_,this}return Xt(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var t=this.nativeEvent;t&&(t.preventDefault?t.preventDefault():typeof t.returnValue!="unknown"&&(t.returnValue=!1),this.isDefaultPrevented=Mc)},stopPropagation:function(){var t=this.nativeEvent;t&&(t.stopPropagation?t.stopPropagation():typeof t.cancelBubble!="unknown"&&(t.cancelBubble=!0),this.isPropagationStopped=Mc)},persist:function(){},isPersistent:Mc}),e}var wl={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Jg=Wi(wl),oc=Xt({},wl,{view:0,detail:0}),$T=Wi(oc),lh,uh,Nl,Id=Xt({},oc,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:e0,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==Nl&&(Nl&&n.type==="mousemove"?(lh=n.screenX-Nl.screenX,uh=n.screenY-Nl.screenY):uh=lh=0,Nl=n),lh)},movementY:function(n){return"movementY"in n?n.movementY:uh}}),O_=Wi(Id),KT=Xt({},Id,{dataTransfer:0}),ZT=Wi(KT),jT=Xt({},oc,{relatedTarget:0}),ch=Wi(jT),QT=Xt({},wl,{animationName:0,elapsedTime:0,pseudoElement:0}),JT=Wi(QT),ew=Xt({},wl,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),tw=Wi(ew),nw=Xt({},wl,{data:0}),k_=Wi(nw),iw={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},rw={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},sw={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function aw(n){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(n):(n=sw[n])?!!e[n]:!1}function e0(){return aw}var ow=Xt({},oc,{key:function(n){if(n.key){var e=iw[n.key]||n.key;if(e!=="Unidentified")return e}return n.type==="keypress"?(n=yf(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?rw[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:e0,charCode:function(n){return n.type==="keypress"?yf(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?yf(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),lw=Wi(ow),uw=Xt({},Id,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),B_=Wi(uw),cw=Xt({},oc,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:e0}),fw=Wi(cw),dw=Xt({},wl,{propertyName:0,elapsedTime:0,pseudoElement:0}),hw=Wi(dw),pw=Xt({},Id,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),mw=Wi(pw),gw=[9,13,27,32],t0=ds&&"CompositionEvent"in window,uu=null;ds&&"documentMode"in document&&(uu=document.documentMode);var _w=ds&&"TextEvent"in window&&!uu,v1=ds&&(!t0||uu&&8<uu&&11>=uu),z_=" ",V_=!1;function x1(n,e){switch(n){case"keyup":return gw.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function y1(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Lo=!1;function vw(n,e){switch(n){case"compositionend":return y1(e);case"keypress":return e.which!==32?null:(V_=!0,z_);case"textInput":return n=e.data,n===z_&&V_?null:n;default:return null}}function xw(n,e){if(Lo)return n==="compositionend"||!t0&&x1(n,e)?(n=_1(),xf=Qg=ks=null,Lo=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return v1&&e.locale!=="ko"?null:e.data;default:return null}}var yw={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function H_(n){var e=n&&n.nodeName&&n.nodeName.toLowerCase();return e==="input"?!!yw[n.type]:e==="textarea"}function S1(n,e,t,i){Qy(i),e=Zf(e,"onChange"),0<e.length&&(t=new Jg("onChange","change",null,t,i),n.push({event:t,listeners:e}))}var cu=null,Uu=null;function Sw(n){L1(n,0)}function Ud(n){var e=Uo(n);if(Xy(e))return n}function Mw(n,e){if(n==="change")return e}var M1=!1;if(ds){var fh;if(ds){var dh="oninput"in document;if(!dh){var G_=document.createElement("div");G_.setAttribute("oninput","return;"),dh=typeof G_.oninput=="function"}fh=dh}else fh=!1;M1=fh&&(!document.documentMode||9<document.documentMode)}function W_(){cu&&(cu.detachEvent("onpropertychange",E1),Uu=cu=null)}function E1(n){if(n.propertyName==="value"&&Ud(Uu)){var e=[];S1(e,Uu,n,qg(n)),n1(Sw,e)}}function Ew(n,e,t){n==="focusin"?(W_(),cu=e,Uu=t,cu.attachEvent("onpropertychange",E1)):n==="focusout"&&W_()}function Tw(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return Ud(Uu)}function ww(n,e){if(n==="click")return Ud(e)}function Aw(n,e){if(n==="input"||n==="change")return Ud(e)}function Cw(n,e){return n===e&&(n!==0||1/n===1/e)||n!==n&&e!==e}var yr=typeof Object.is=="function"?Object.is:Cw;function Fu(n,e){if(yr(n,e))return!0;if(typeof n!="object"||n===null||typeof e!="object"||e===null)return!1;var t=Object.keys(n),i=Object.keys(e);if(t.length!==i.length)return!1;for(i=0;i<t.length;i++){var r=t[i];if(!bp.call(e,r)||!yr(n[r],e[r]))return!1}return!0}function X_(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function Y_(n,e){var t=X_(n);n=0;for(var i;t;){if(t.nodeType===3){if(i=n+t.textContent.length,n<=e&&i>=e)return{node:t,offset:e-n};n=i}e:{for(;t;){if(t.nextSibling){t=t.nextSibling;break e}t=t.parentNode}t=void 0}t=X_(t)}}function T1(n,e){return n&&e?n===e?!0:n&&n.nodeType===3?!1:e&&e.nodeType===3?T1(n,e.parentNode):"contains"in n?n.contains(e):n.compareDocumentPosition?!!(n.compareDocumentPosition(e)&16):!1:!1}function w1(){for(var n=window,e=Gf();e instanceof n.HTMLIFrameElement;){try{var t=typeof e.contentWindow.location.href=="string"}catch{t=!1}if(t)n=e.contentWindow;else break;e=Gf(n.document)}return e}function n0(n){var e=n&&n.nodeName&&n.nodeName.toLowerCase();return e&&(e==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||e==="textarea"||n.contentEditable==="true")}function Rw(n){var e=w1(),t=n.focusedElem,i=n.selectionRange;if(e!==t&&t&&t.ownerDocument&&T1(t.ownerDocument.documentElement,t)){if(i!==null&&n0(t)){if(e=i.start,n=i.end,n===void 0&&(n=e),"selectionStart"in t)t.selectionStart=e,t.selectionEnd=Math.min(n,t.value.length);else if(n=(e=t.ownerDocument||document)&&e.defaultView||window,n.getSelection){n=n.getSelection();var r=t.textContent.length,s=Math.min(i.start,r);i=i.end===void 0?s:Math.min(i.end,r),!n.extend&&s>i&&(r=i,i=s,s=r),r=Y_(t,s);var a=Y_(t,i);r&&a&&(n.rangeCount!==1||n.anchorNode!==r.node||n.anchorOffset!==r.offset||n.focusNode!==a.node||n.focusOffset!==a.offset)&&(e=e.createRange(),e.setStart(r.node,r.offset),n.removeAllRanges(),s>i?(n.addRange(e),n.extend(a.node,a.offset)):(e.setEnd(a.node,a.offset),n.addRange(e)))}}for(e=[],n=t;n=n.parentNode;)n.nodeType===1&&e.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof t.focus=="function"&&t.focus(),t=0;t<e.length;t++)n=e[t],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var bw=ds&&"documentMode"in document&&11>=document.documentMode,No=null,$p=null,fu=null,Kp=!1;function q_(n,e,t){var i=t.window===t?t.document:t.nodeType===9?t:t.ownerDocument;Kp||No==null||No!==Gf(i)||(i=No,"selectionStart"in i&&n0(i)?i={start:i.selectionStart,end:i.selectionEnd}:(i=(i.ownerDocument&&i.ownerDocument.defaultView||window).getSelection(),i={anchorNode:i.anchorNode,anchorOffset:i.anchorOffset,focusNode:i.focusNode,focusOffset:i.focusOffset}),fu&&Fu(fu,i)||(fu=i,i=Zf($p,"onSelect"),0<i.length&&(e=new Jg("onSelect","select",null,e,t),n.push({event:e,listeners:i}),e.target=No)))}function Ec(n,e){var t={};return t[n.toLowerCase()]=e.toLowerCase(),t["Webkit"+n]="webkit"+e,t["Moz"+n]="moz"+e,t}var Io={animationend:Ec("Animation","AnimationEnd"),animationiteration:Ec("Animation","AnimationIteration"),animationstart:Ec("Animation","AnimationStart"),transitionend:Ec("Transition","TransitionEnd")},hh={},A1={};ds&&(A1=document.createElement("div").style,"AnimationEvent"in window||(delete Io.animationend.animation,delete Io.animationiteration.animation,delete Io.animationstart.animation),"TransitionEvent"in window||delete Io.transitionend.transition);function Fd(n){if(hh[n])return hh[n];if(!Io[n])return n;var e=Io[n],t;for(t in e)if(e.hasOwnProperty(t)&&t in A1)return hh[n]=e[t];return n}var C1=Fd("animationend"),R1=Fd("animationiteration"),b1=Fd("animationstart"),P1=Fd("transitionend"),D1=new Map,$_="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function ca(n,e){D1.set(n,e),eo(e,[n])}for(var ph=0;ph<$_.length;ph++){var mh=$_[ph],Pw=mh.toLowerCase(),Dw=mh[0].toUpperCase()+mh.slice(1);ca(Pw,"on"+Dw)}ca(C1,"onAnimationEnd");ca(R1,"onAnimationIteration");ca(b1,"onAnimationStart");ca("dblclick","onDoubleClick");ca("focusin","onFocus");ca("focusout","onBlur");ca(P1,"onTransitionEnd");ol("onMouseEnter",["mouseout","mouseover"]);ol("onMouseLeave",["mouseout","mouseover"]);ol("onPointerEnter",["pointerout","pointerover"]);ol("onPointerLeave",["pointerout","pointerover"]);eo("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));eo("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));eo("onBeforeInput",["compositionend","keypress","textInput","paste"]);eo("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));eo("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));eo("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var jl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Lw=new Set("cancel close invalid load scroll toggle".split(" ").concat(jl));function K_(n,e,t){var i=n.type||"unknown-event";n.currentTarget=t,PT(i,e,void 0,n),n.currentTarget=null}function L1(n,e){e=(e&4)!==0;for(var t=0;t<n.length;t++){var i=n[t],r=i.event;i=i.listeners;e:{var s=void 0;if(e)for(var a=i.length-1;0<=a;a--){var o=i[a],l=o.instance,u=o.currentTarget;if(o=o.listener,l!==s&&r.isPropagationStopped())break e;K_(r,o,u),s=l}else for(a=0;a<i.length;a++){if(o=i[a],l=o.instance,u=o.currentTarget,o=o.listener,l!==s&&r.isPropagationStopped())break e;K_(r,o,u),s=l}}}if(Xf)throw n=Wp,Xf=!1,Wp=null,n}function Ft(n,e){var t=e[em];t===void 0&&(t=e[em]=new Set);var i=n+"__bubble";t.has(i)||(N1(e,n,2,!1),t.add(i))}function gh(n,e,t){var i=0;e&&(i|=4),N1(t,n,i,e)}var Tc="_reactListening"+Math.random().toString(36).slice(2);function Ou(n){if(!n[Tc]){n[Tc]=!0,zy.forEach(function(t){t!=="selectionchange"&&(Lw.has(t)||gh(t,!1,n),gh(t,!0,n))});var e=n.nodeType===9?n:n.ownerDocument;e===null||e[Tc]||(e[Tc]=!0,gh("selectionchange",!1,e))}}function N1(n,e,t,i){switch(g1(e)){case 1:var r=YT;break;case 4:r=qT;break;default:r=jg}t=r.bind(null,e,t,n),r=void 0,!Gp||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(r=!0),i?r!==void 0?n.addEventListener(e,t,{capture:!0,passive:r}):n.addEventListener(e,t,!0):r!==void 0?n.addEventListener(e,t,{passive:r}):n.addEventListener(e,t,!1)}function _h(n,e,t,i,r){var s=i;if(!(e&1)&&!(e&2)&&i!==null)e:for(;;){if(i===null)return;var a=i.tag;if(a===3||a===4){var o=i.stateNode.containerInfo;if(o===r||o.nodeType===8&&o.parentNode===r)break;if(a===4)for(a=i.return;a!==null;){var l=a.tag;if((l===3||l===4)&&(l=a.stateNode.containerInfo,l===r||l.nodeType===8&&l.parentNode===r))return;a=a.return}for(;o!==null;){if(a=Ra(o),a===null)return;if(l=a.tag,l===5||l===6){i=s=a;continue e}o=o.parentNode}}i=i.return}n1(function(){var u=s,c=qg(t),d=[];e:{var f=D1.get(n);if(f!==void 0){var h=Jg,m=n;switch(n){case"keypress":if(yf(t)===0)break e;case"keydown":case"keyup":h=lw;break;case"focusin":m="focus",h=ch;break;case"focusout":m="blur",h=ch;break;case"beforeblur":case"afterblur":h=ch;break;case"click":if(t.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":h=O_;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":h=ZT;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":h=fw;break;case C1:case R1:case b1:h=JT;break;case P1:h=hw;break;case"scroll":h=$T;break;case"wheel":h=mw;break;case"copy":case"cut":case"paste":h=tw;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":h=B_}var _=(e&4)!==0,g=!_&&n==="scroll",p=_?f!==null?f+"Capture":null:f;_=[];for(var v=u,S;v!==null;){S=v;var x=S.stateNode;if(S.tag===5&&x!==null&&(S=x,p!==null&&(x=Du(v,p),x!=null&&_.push(ku(v,x,S)))),g)break;v=v.return}0<_.length&&(f=new h(f,m,null,t,c),d.push({event:f,listeners:_}))}}if(!(e&7)){e:{if(f=n==="mouseover"||n==="pointerover",h=n==="mouseout"||n==="pointerout",f&&t!==Vp&&(m=t.relatedTarget||t.fromElement)&&(Ra(m)||m[hs]))break e;if((h||f)&&(f=c.window===c?c:(f=c.ownerDocument)?f.defaultView||f.parentWindow:window,h?(m=t.relatedTarget||t.toElement,h=u,m=m?Ra(m):null,m!==null&&(g=to(m),m!==g||m.tag!==5&&m.tag!==6)&&(m=null)):(h=null,m=u),h!==m)){if(_=O_,x="onMouseLeave",p="onMouseEnter",v="mouse",(n==="pointerout"||n==="pointerover")&&(_=B_,x="onPointerLeave",p="onPointerEnter",v="pointer"),g=h==null?f:Uo(h),S=m==null?f:Uo(m),f=new _(x,v+"leave",h,t,c),f.target=g,f.relatedTarget=S,x=null,Ra(c)===u&&(_=new _(p,v+"enter",m,t,c),_.target=S,_.relatedTarget=g,x=_),g=x,h&&m)t:{for(_=h,p=m,v=0,S=_;S;S=oo(S))v++;for(S=0,x=p;x;x=oo(x))S++;for(;0<v-S;)_=oo(_),v--;for(;0<S-v;)p=oo(p),S--;for(;v--;){if(_===p||p!==null&&_===p.alternate)break t;_=oo(_),p=oo(p)}_=null}else _=null;h!==null&&Z_(d,f,h,_,!1),m!==null&&g!==null&&Z_(d,g,m,_,!0)}}e:{if(f=u?Uo(u):window,h=f.nodeName&&f.nodeName.toLowerCase(),h==="select"||h==="input"&&f.type==="file")var E=Mw;else if(H_(f))if(M1)E=Aw;else{E=Tw;var T=Ew}else(h=f.nodeName)&&h.toLowerCase()==="input"&&(f.type==="checkbox"||f.type==="radio")&&(E=ww);if(E&&(E=E(n,u))){S1(d,E,t,c);break e}T&&T(n,f,u),n==="focusout"&&(T=f._wrapperState)&&T.controlled&&f.type==="number"&&Fp(f,"number",f.value)}switch(T=u?Uo(u):window,n){case"focusin":(H_(T)||T.contentEditable==="true")&&(No=T,$p=u,fu=null);break;case"focusout":fu=$p=No=null;break;case"mousedown":Kp=!0;break;case"contextmenu":case"mouseup":case"dragend":Kp=!1,q_(d,t,c);break;case"selectionchange":if(bw)break;case"keydown":case"keyup":q_(d,t,c)}var w;if(t0)e:{switch(n){case"compositionstart":var y="onCompositionStart";break e;case"compositionend":y="onCompositionEnd";break e;case"compositionupdate":y="onCompositionUpdate";break e}y=void 0}else Lo?x1(n,t)&&(y="onCompositionEnd"):n==="keydown"&&t.keyCode===229&&(y="onCompositionStart");y&&(v1&&t.locale!=="ko"&&(Lo||y!=="onCompositionStart"?y==="onCompositionEnd"&&Lo&&(w=_1()):(ks=c,Qg="value"in ks?ks.value:ks.textContent,Lo=!0)),T=Zf(u,y),0<T.length&&(y=new k_(y,n,null,t,c),d.push({event:y,listeners:T}),w?y.data=w:(w=y1(t),w!==null&&(y.data=w)))),(w=_w?vw(n,t):xw(n,t))&&(u=Zf(u,"onBeforeInput"),0<u.length&&(c=new k_("onBeforeInput","beforeinput",null,t,c),d.push({event:c,listeners:u}),c.data=w))}L1(d,e)})}function ku(n,e,t){return{instance:n,listener:e,currentTarget:t}}function Zf(n,e){for(var t=e+"Capture",i=[];n!==null;){var r=n,s=r.stateNode;r.tag===5&&s!==null&&(r=s,s=Du(n,t),s!=null&&i.unshift(ku(n,s,r)),s=Du(n,e),s!=null&&i.push(ku(n,s,r))),n=n.return}return i}function oo(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Z_(n,e,t,i,r){for(var s=e._reactName,a=[];t!==null&&t!==i;){var o=t,l=o.alternate,u=o.stateNode;if(l!==null&&l===i)break;o.tag===5&&u!==null&&(o=u,r?(l=Du(t,s),l!=null&&a.unshift(ku(t,l,o))):r||(l=Du(t,s),l!=null&&a.push(ku(t,l,o)))),t=t.return}a.length!==0&&n.push({event:e,listeners:a})}var Nw=/\r\n?/g,Iw=/\u0000|\uFFFD/g;function j_(n){return(typeof n=="string"?n:""+n).replace(Nw,`
`).replace(Iw,"")}function wc(n,e,t){if(e=j_(e),j_(n)!==e&&t)throw Error(fe(425))}function jf(){}var Zp=null,jp=null;function Qp(n,e){return n==="textarea"||n==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var Jp=typeof setTimeout=="function"?setTimeout:void 0,Uw=typeof clearTimeout=="function"?clearTimeout:void 0,Q_=typeof Promise=="function"?Promise:void 0,Fw=typeof queueMicrotask=="function"?queueMicrotask:typeof Q_<"u"?function(n){return Q_.resolve(null).then(n).catch(Ow)}:Jp;function Ow(n){setTimeout(function(){throw n})}function vh(n,e){var t=e,i=0;do{var r=t.nextSibling;if(n.removeChild(t),r&&r.nodeType===8)if(t=r.data,t==="/$"){if(i===0){n.removeChild(r),Iu(e);return}i--}else t!=="$"&&t!=="$?"&&t!=="$!"||i++;t=r}while(t);Iu(e)}function Ks(n){for(;n!=null;n=n.nextSibling){var e=n.nodeType;if(e===1||e===3)break;if(e===8){if(e=n.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return n}function J_(n){n=n.previousSibling;for(var e=0;n;){if(n.nodeType===8){var t=n.data;if(t==="$"||t==="$!"||t==="$?"){if(e===0)return n;e--}else t==="/$"&&e++}n=n.previousSibling}return null}var Al=Math.random().toString(36).slice(2),Dr="__reactFiber$"+Al,Bu="__reactProps$"+Al,hs="__reactContainer$"+Al,em="__reactEvents$"+Al,kw="__reactListeners$"+Al,Bw="__reactHandles$"+Al;function Ra(n){var e=n[Dr];if(e)return e;for(var t=n.parentNode;t;){if(e=t[hs]||t[Dr]){if(t=e.alternate,e.child!==null||t!==null&&t.child!==null)for(n=J_(n);n!==null;){if(t=n[Dr])return t;n=J_(n)}return e}n=t,t=n.parentNode}return null}function lc(n){return n=n[Dr]||n[hs],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Uo(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(fe(33))}function Od(n){return n[Bu]||null}var tm=[],Fo=-1;function fa(n){return{current:n}}function Ot(n){0>Fo||(n.current=tm[Fo],tm[Fo]=null,Fo--)}function Nt(n,e){Fo++,tm[Fo]=n.current,n.current=e}var ra={},$n=fa(ra),pi=fa(!1),Wa=ra;function ll(n,e){var t=n.type.contextTypes;if(!t)return ra;var i=n.stateNode;if(i&&i.__reactInternalMemoizedUnmaskedChildContext===e)return i.__reactInternalMemoizedMaskedChildContext;var r={},s;for(s in t)r[s]=e[s];return i&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=e,n.__reactInternalMemoizedMaskedChildContext=r),r}function mi(n){return n=n.childContextTypes,n!=null}function Qf(){Ot(pi),Ot($n)}function ev(n,e,t){if($n.current!==ra)throw Error(fe(168));Nt($n,e),Nt(pi,t)}function I1(n,e,t){var i=n.stateNode;if(e=e.childContextTypes,typeof i.getChildContext!="function")return t;i=i.getChildContext();for(var r in i)if(!(r in e))throw Error(fe(108,ET(n)||"Unknown",r));return Xt({},t,i)}function Jf(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||ra,Wa=$n.current,Nt($n,n),Nt(pi,pi.current),!0}function tv(n,e,t){var i=n.stateNode;if(!i)throw Error(fe(169));t?(n=I1(n,e,Wa),i.__reactInternalMemoizedMergedChildContext=n,Ot(pi),Ot($n),Nt($n,n)):Ot(pi),Nt(pi,t)}var Jr=null,kd=!1,xh=!1;function U1(n){Jr===null?Jr=[n]:Jr.push(n)}function zw(n){kd=!0,U1(n)}function da(){if(!xh&&Jr!==null){xh=!0;var n=0,e=Et;try{var t=Jr;for(Et=1;n<t.length;n++){var i=t[n];do i=i(!0);while(i!==null)}Jr=null,kd=!1}catch(r){throw Jr!==null&&(Jr=Jr.slice(n+1)),a1($g,da),r}finally{Et=e,xh=!1}}return null}var Oo=[],ko=0,ed=null,td=0,Ki=[],Zi=0,Xa=null,is=1,rs="";function ya(n,e){Oo[ko++]=td,Oo[ko++]=ed,ed=n,td=e}function F1(n,e,t){Ki[Zi++]=is,Ki[Zi++]=rs,Ki[Zi++]=Xa,Xa=n;var i=is;n=rs;var r=32-vr(i)-1;i&=~(1<<r),t+=1;var s=32-vr(e)+r;if(30<s){var a=r-r%5;s=(i&(1<<a)-1).toString(32),i>>=a,r-=a,is=1<<32-vr(e)+r|t<<r|i,rs=s+n}else is=1<<s|t<<r|i,rs=n}function i0(n){n.return!==null&&(ya(n,1),F1(n,1,0))}function r0(n){for(;n===ed;)ed=Oo[--ko],Oo[ko]=null,td=Oo[--ko],Oo[ko]=null;for(;n===Xa;)Xa=Ki[--Zi],Ki[Zi]=null,rs=Ki[--Zi],Ki[Zi]=null,is=Ki[--Zi],Ki[Zi]=null}var Oi=null,Ii=null,kt=!1,pr=null;function O1(n,e){var t=er(5,null,null,0);t.elementType="DELETED",t.stateNode=e,t.return=n,e=n.deletions,e===null?(n.deletions=[t],n.flags|=16):e.push(t)}function nv(n,e){switch(n.tag){case 5:var t=n.type;return e=e.nodeType!==1||t.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(n.stateNode=e,Oi=n,Ii=Ks(e.firstChild),!0):!1;case 6:return e=n.pendingProps===""||e.nodeType!==3?null:e,e!==null?(n.stateNode=e,Oi=n,Ii=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(t=Xa!==null?{id:is,overflow:rs}:null,n.memoizedState={dehydrated:e,treeContext:t,retryLane:1073741824},t=er(18,null,null,0),t.stateNode=e,t.return=n,n.child=t,Oi=n,Ii=null,!0):!1;default:return!1}}function nm(n){return(n.mode&1)!==0&&(n.flags&128)===0}function im(n){if(kt){var e=Ii;if(e){var t=e;if(!nv(n,e)){if(nm(n))throw Error(fe(418));e=Ks(t.nextSibling);var i=Oi;e&&nv(n,e)?O1(i,t):(n.flags=n.flags&-4097|2,kt=!1,Oi=n)}}else{if(nm(n))throw Error(fe(418));n.flags=n.flags&-4097|2,kt=!1,Oi=n}}}function iv(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;Oi=n}function Ac(n){if(n!==Oi)return!1;if(!kt)return iv(n),kt=!0,!1;var e;if((e=n.tag!==3)&&!(e=n.tag!==5)&&(e=n.type,e=e!=="head"&&e!=="body"&&!Qp(n.type,n.memoizedProps)),e&&(e=Ii)){if(nm(n))throw k1(),Error(fe(418));for(;e;)O1(n,e),e=Ks(e.nextSibling)}if(iv(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(fe(317));e:{for(n=n.nextSibling,e=0;n;){if(n.nodeType===8){var t=n.data;if(t==="/$"){if(e===0){Ii=Ks(n.nextSibling);break e}e--}else t!=="$"&&t!=="$!"&&t!=="$?"||e++}n=n.nextSibling}Ii=null}}else Ii=Oi?Ks(n.stateNode.nextSibling):null;return!0}function k1(){for(var n=Ii;n;)n=Ks(n.nextSibling)}function ul(){Ii=Oi=null,kt=!1}function s0(n){pr===null?pr=[n]:pr.push(n)}var Vw=ys.ReactCurrentBatchConfig;function Il(n,e,t){if(n=t.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(t._owner){if(t=t._owner,t){if(t.tag!==1)throw Error(fe(309));var i=t.stateNode}if(!i)throw Error(fe(147,n));var r=i,s=""+n;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===s?e.ref:(e=function(a){var o=r.refs;a===null?delete o[s]:o[s]=a},e._stringRef=s,e)}if(typeof n!="string")throw Error(fe(284));if(!t._owner)throw Error(fe(290,n))}return n}function Cc(n,e){throw n=Object.prototype.toString.call(e),Error(fe(31,n==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":n))}function rv(n){var e=n._init;return e(n._payload)}function B1(n){function e(p,v){if(n){var S=p.deletions;S===null?(p.deletions=[v],p.flags|=16):S.push(v)}}function t(p,v){if(!n)return null;for(;v!==null;)e(p,v),v=v.sibling;return null}function i(p,v){for(p=new Map;v!==null;)v.key!==null?p.set(v.key,v):p.set(v.index,v),v=v.sibling;return p}function r(p,v){return p=Js(p,v),p.index=0,p.sibling=null,p}function s(p,v,S){return p.index=S,n?(S=p.alternate,S!==null?(S=S.index,S<v?(p.flags|=2,v):S):(p.flags|=2,v)):(p.flags|=1048576,v)}function a(p){return n&&p.alternate===null&&(p.flags|=2),p}function o(p,v,S,x){return v===null||v.tag!==6?(v=Ah(S,p.mode,x),v.return=p,v):(v=r(v,S),v.return=p,v)}function l(p,v,S,x){var E=S.type;return E===Do?c(p,v,S.props.children,x,S.key):v!==null&&(v.elementType===E||typeof E=="object"&&E!==null&&E.$$typeof===Ns&&rv(E)===v.type)?(x=r(v,S.props),x.ref=Il(p,v,S),x.return=p,x):(x=Cf(S.type,S.key,S.props,null,p.mode,x),x.ref=Il(p,v,S),x.return=p,x)}function u(p,v,S,x){return v===null||v.tag!==4||v.stateNode.containerInfo!==S.containerInfo||v.stateNode.implementation!==S.implementation?(v=Ch(S,p.mode,x),v.return=p,v):(v=r(v,S.children||[]),v.return=p,v)}function c(p,v,S,x,E){return v===null||v.tag!==7?(v=Fa(S,p.mode,x,E),v.return=p,v):(v=r(v,S),v.return=p,v)}function d(p,v,S){if(typeof v=="string"&&v!==""||typeof v=="number")return v=Ah(""+v,p.mode,S),v.return=p,v;if(typeof v=="object"&&v!==null){switch(v.$$typeof){case gc:return S=Cf(v.type,v.key,v.props,null,p.mode,S),S.ref=Il(p,null,v),S.return=p,S;case Po:return v=Ch(v,p.mode,S),v.return=p,v;case Ns:var x=v._init;return d(p,x(v._payload),S)}if(Kl(v)||bl(v))return v=Fa(v,p.mode,S,null),v.return=p,v;Cc(p,v)}return null}function f(p,v,S,x){var E=v!==null?v.key:null;if(typeof S=="string"&&S!==""||typeof S=="number")return E!==null?null:o(p,v,""+S,x);if(typeof S=="object"&&S!==null){switch(S.$$typeof){case gc:return S.key===E?l(p,v,S,x):null;case Po:return S.key===E?u(p,v,S,x):null;case Ns:return E=S._init,f(p,v,E(S._payload),x)}if(Kl(S)||bl(S))return E!==null?null:c(p,v,S,x,null);Cc(p,S)}return null}function h(p,v,S,x,E){if(typeof x=="string"&&x!==""||typeof x=="number")return p=p.get(S)||null,o(v,p,""+x,E);if(typeof x=="object"&&x!==null){switch(x.$$typeof){case gc:return p=p.get(x.key===null?S:x.key)||null,l(v,p,x,E);case Po:return p=p.get(x.key===null?S:x.key)||null,u(v,p,x,E);case Ns:var T=x._init;return h(p,v,S,T(x._payload),E)}if(Kl(x)||bl(x))return p=p.get(S)||null,c(v,p,x,E,null);Cc(v,x)}return null}function m(p,v,S,x){for(var E=null,T=null,w=v,y=v=0,A=null;w!==null&&y<S.length;y++){w.index>y?(A=w,w=null):A=w.sibling;var R=f(p,w,S[y],x);if(R===null){w===null&&(w=A);break}n&&w&&R.alternate===null&&e(p,w),v=s(R,v,y),T===null?E=R:T.sibling=R,T=R,w=A}if(y===S.length)return t(p,w),kt&&ya(p,y),E;if(w===null){for(;y<S.length;y++)w=d(p,S[y],x),w!==null&&(v=s(w,v,y),T===null?E=w:T.sibling=w,T=w);return kt&&ya(p,y),E}for(w=i(p,w);y<S.length;y++)A=h(w,p,y,S[y],x),A!==null&&(n&&A.alternate!==null&&w.delete(A.key===null?y:A.key),v=s(A,v,y),T===null?E=A:T.sibling=A,T=A);return n&&w.forEach(function(D){return e(p,D)}),kt&&ya(p,y),E}function _(p,v,S,x){var E=bl(S);if(typeof E!="function")throw Error(fe(150));if(S=E.call(S),S==null)throw Error(fe(151));for(var T=E=null,w=v,y=v=0,A=null,R=S.next();w!==null&&!R.done;y++,R=S.next()){w.index>y?(A=w,w=null):A=w.sibling;var D=f(p,w,R.value,x);if(D===null){w===null&&(w=A);break}n&&w&&D.alternate===null&&e(p,w),v=s(D,v,y),T===null?E=D:T.sibling=D,T=D,w=A}if(R.done)return t(p,w),kt&&ya(p,y),E;if(w===null){for(;!R.done;y++,R=S.next())R=d(p,R.value,x),R!==null&&(v=s(R,v,y),T===null?E=R:T.sibling=R,T=R);return kt&&ya(p,y),E}for(w=i(p,w);!R.done;y++,R=S.next())R=h(w,p,y,R.value,x),R!==null&&(n&&R.alternate!==null&&w.delete(R.key===null?y:R.key),v=s(R,v,y),T===null?E=R:T.sibling=R,T=R);return n&&w.forEach(function(L){return e(p,L)}),kt&&ya(p,y),E}function g(p,v,S,x){if(typeof S=="object"&&S!==null&&S.type===Do&&S.key===null&&(S=S.props.children),typeof S=="object"&&S!==null){switch(S.$$typeof){case gc:e:{for(var E=S.key,T=v;T!==null;){if(T.key===E){if(E=S.type,E===Do){if(T.tag===7){t(p,T.sibling),v=r(T,S.props.children),v.return=p,p=v;break e}}else if(T.elementType===E||typeof E=="object"&&E!==null&&E.$$typeof===Ns&&rv(E)===T.type){t(p,T.sibling),v=r(T,S.props),v.ref=Il(p,T,S),v.return=p,p=v;break e}t(p,T);break}else e(p,T);T=T.sibling}S.type===Do?(v=Fa(S.props.children,p.mode,x,S.key),v.return=p,p=v):(x=Cf(S.type,S.key,S.props,null,p.mode,x),x.ref=Il(p,v,S),x.return=p,p=x)}return a(p);case Po:e:{for(T=S.key;v!==null;){if(v.key===T)if(v.tag===4&&v.stateNode.containerInfo===S.containerInfo&&v.stateNode.implementation===S.implementation){t(p,v.sibling),v=r(v,S.children||[]),v.return=p,p=v;break e}else{t(p,v);break}else e(p,v);v=v.sibling}v=Ch(S,p.mode,x),v.return=p,p=v}return a(p);case Ns:return T=S._init,g(p,v,T(S._payload),x)}if(Kl(S))return m(p,v,S,x);if(bl(S))return _(p,v,S,x);Cc(p,S)}return typeof S=="string"&&S!==""||typeof S=="number"?(S=""+S,v!==null&&v.tag===6?(t(p,v.sibling),v=r(v,S),v.return=p,p=v):(t(p,v),v=Ah(S,p.mode,x),v.return=p,p=v),a(p)):t(p,v)}return g}var cl=B1(!0),z1=B1(!1),nd=fa(null),id=null,Bo=null,a0=null;function o0(){a0=Bo=id=null}function l0(n){var e=nd.current;Ot(nd),n._currentValue=e}function rm(n,e,t){for(;n!==null;){var i=n.alternate;if((n.childLanes&e)!==e?(n.childLanes|=e,i!==null&&(i.childLanes|=e)):i!==null&&(i.childLanes&e)!==e&&(i.childLanes|=e),n===t)break;n=n.return}}function Ko(n,e){id=n,a0=Bo=null,n=n.dependencies,n!==null&&n.firstContext!==null&&(n.lanes&e&&(hi=!0),n.firstContext=null)}function sr(n){var e=n._currentValue;if(a0!==n)if(n={context:n,memoizedValue:e,next:null},Bo===null){if(id===null)throw Error(fe(308));Bo=n,id.dependencies={lanes:0,firstContext:n}}else Bo=Bo.next=n;return e}var ba=null;function u0(n){ba===null?ba=[n]:ba.push(n)}function V1(n,e,t,i){var r=e.interleaved;return r===null?(t.next=t,u0(e)):(t.next=r.next,r.next=t),e.interleaved=t,ps(n,i)}function ps(n,e){n.lanes|=e;var t=n.alternate;for(t!==null&&(t.lanes|=e),t=n,n=n.return;n!==null;)n.childLanes|=e,t=n.alternate,t!==null&&(t.childLanes|=e),t=n,n=n.return;return t.tag===3?t.stateNode:null}var Is=!1;function c0(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function H1(n,e){n=n.updateQueue,e.updateQueue===n&&(e.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function os(n,e){return{eventTime:n,lane:e,tag:0,payload:null,callback:null,next:null}}function Zs(n,e,t){var i=n.updateQueue;if(i===null)return null;if(i=i.shared,_t&2){var r=i.pending;return r===null?e.next=e:(e.next=r.next,r.next=e),i.pending=e,ps(n,t)}return r=i.interleaved,r===null?(e.next=e,u0(i)):(e.next=r.next,r.next=e),i.interleaved=e,ps(n,t)}function Sf(n,e,t){if(e=e.updateQueue,e!==null&&(e=e.shared,(t&4194240)!==0)){var i=e.lanes;i&=n.pendingLanes,t|=i,e.lanes=t,Kg(n,t)}}function sv(n,e){var t=n.updateQueue,i=n.alternate;if(i!==null&&(i=i.updateQueue,t===i)){var r=null,s=null;if(t=t.firstBaseUpdate,t!==null){do{var a={eventTime:t.eventTime,lane:t.lane,tag:t.tag,payload:t.payload,callback:t.callback,next:null};s===null?r=s=a:s=s.next=a,t=t.next}while(t!==null);s===null?r=s=e:s=s.next=e}else r=s=e;t={baseState:i.baseState,firstBaseUpdate:r,lastBaseUpdate:s,shared:i.shared,effects:i.effects},n.updateQueue=t;return}n=t.lastBaseUpdate,n===null?t.firstBaseUpdate=e:n.next=e,t.lastBaseUpdate=e}function rd(n,e,t,i){var r=n.updateQueue;Is=!1;var s=r.firstBaseUpdate,a=r.lastBaseUpdate,o=r.shared.pending;if(o!==null){r.shared.pending=null;var l=o,u=l.next;l.next=null,a===null?s=u:a.next=u,a=l;var c=n.alternate;c!==null&&(c=c.updateQueue,o=c.lastBaseUpdate,o!==a&&(o===null?c.firstBaseUpdate=u:o.next=u,c.lastBaseUpdate=l))}if(s!==null){var d=r.baseState;a=0,c=u=l=null,o=s;do{var f=o.lane,h=o.eventTime;if((i&f)===f){c!==null&&(c=c.next={eventTime:h,lane:0,tag:o.tag,payload:o.payload,callback:o.callback,next:null});e:{var m=n,_=o;switch(f=e,h=t,_.tag){case 1:if(m=_.payload,typeof m=="function"){d=m.call(h,d,f);break e}d=m;break e;case 3:m.flags=m.flags&-65537|128;case 0:if(m=_.payload,f=typeof m=="function"?m.call(h,d,f):m,f==null)break e;d=Xt({},d,f);break e;case 2:Is=!0}}o.callback!==null&&o.lane!==0&&(n.flags|=64,f=r.effects,f===null?r.effects=[o]:f.push(o))}else h={eventTime:h,lane:f,tag:o.tag,payload:o.payload,callback:o.callback,next:null},c===null?(u=c=h,l=d):c=c.next=h,a|=f;if(o=o.next,o===null){if(o=r.shared.pending,o===null)break;f=o,o=f.next,f.next=null,r.lastBaseUpdate=f,r.shared.pending=null}}while(!0);if(c===null&&(l=d),r.baseState=l,r.firstBaseUpdate=u,r.lastBaseUpdate=c,e=r.shared.interleaved,e!==null){r=e;do a|=r.lane,r=r.next;while(r!==e)}else s===null&&(r.shared.lanes=0);qa|=a,n.lanes=a,n.memoizedState=d}}function av(n,e,t){if(n=e.effects,e.effects=null,n!==null)for(e=0;e<n.length;e++){var i=n[e],r=i.callback;if(r!==null){if(i.callback=null,i=t,typeof r!="function")throw Error(fe(191,r));r.call(i)}}}var uc={},kr=fa(uc),zu=fa(uc),Vu=fa(uc);function Pa(n){if(n===uc)throw Error(fe(174));return n}function f0(n,e){switch(Nt(Vu,e),Nt(zu,n),Nt(kr,uc),n=e.nodeType,n){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:kp(null,"");break;default:n=n===8?e.parentNode:e,e=n.namespaceURI||null,n=n.tagName,e=kp(e,n)}Ot(kr),Nt(kr,e)}function fl(){Ot(kr),Ot(zu),Ot(Vu)}function G1(n){Pa(Vu.current);var e=Pa(kr.current),t=kp(e,n.type);e!==t&&(Nt(zu,n),Nt(kr,t))}function d0(n){zu.current===n&&(Ot(kr),Ot(zu))}var Vt=fa(0);function sd(n){for(var e=n;e!==null;){if(e.tag===13){var t=e.memoizedState;if(t!==null&&(t=t.dehydrated,t===null||t.data==="$?"||t.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===n)break;for(;e.sibling===null;){if(e.return===null||e.return===n)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var yh=[];function h0(){for(var n=0;n<yh.length;n++)yh[n]._workInProgressVersionPrimary=null;yh.length=0}var Mf=ys.ReactCurrentDispatcher,Sh=ys.ReactCurrentBatchConfig,Ya=0,Wt=null,gn=null,An=null,ad=!1,du=!1,Hu=0,Hw=0;function On(){throw Error(fe(321))}function p0(n,e){if(e===null)return!1;for(var t=0;t<e.length&&t<n.length;t++)if(!yr(n[t],e[t]))return!1;return!0}function m0(n,e,t,i,r,s){if(Ya=s,Wt=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,Mf.current=n===null||n.memoizedState===null?Yw:qw,n=t(i,r),du){s=0;do{if(du=!1,Hu=0,25<=s)throw Error(fe(301));s+=1,An=gn=null,e.updateQueue=null,Mf.current=$w,n=t(i,r)}while(du)}if(Mf.current=od,e=gn!==null&&gn.next!==null,Ya=0,An=gn=Wt=null,ad=!1,e)throw Error(fe(300));return n}function g0(){var n=Hu!==0;return Hu=0,n}function Cr(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return An===null?Wt.memoizedState=An=n:An=An.next=n,An}function ar(){if(gn===null){var n=Wt.alternate;n=n!==null?n.memoizedState:null}else n=gn.next;var e=An===null?Wt.memoizedState:An.next;if(e!==null)An=e,gn=n;else{if(n===null)throw Error(fe(310));gn=n,n={memoizedState:gn.memoizedState,baseState:gn.baseState,baseQueue:gn.baseQueue,queue:gn.queue,next:null},An===null?Wt.memoizedState=An=n:An=An.next=n}return An}function Gu(n,e){return typeof e=="function"?e(n):e}function Mh(n){var e=ar(),t=e.queue;if(t===null)throw Error(fe(311));t.lastRenderedReducer=n;var i=gn,r=i.baseQueue,s=t.pending;if(s!==null){if(r!==null){var a=r.next;r.next=s.next,s.next=a}i.baseQueue=r=s,t.pending=null}if(r!==null){s=r.next,i=i.baseState;var o=a=null,l=null,u=s;do{var c=u.lane;if((Ya&c)===c)l!==null&&(l=l.next={lane:0,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null}),i=u.hasEagerState?u.eagerState:n(i,u.action);else{var d={lane:c,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null};l===null?(o=l=d,a=i):l=l.next=d,Wt.lanes|=c,qa|=c}u=u.next}while(u!==null&&u!==s);l===null?a=i:l.next=o,yr(i,e.memoizedState)||(hi=!0),e.memoizedState=i,e.baseState=a,e.baseQueue=l,t.lastRenderedState=i}if(n=t.interleaved,n!==null){r=n;do s=r.lane,Wt.lanes|=s,qa|=s,r=r.next;while(r!==n)}else r===null&&(t.lanes=0);return[e.memoizedState,t.dispatch]}function Eh(n){var e=ar(),t=e.queue;if(t===null)throw Error(fe(311));t.lastRenderedReducer=n;var i=t.dispatch,r=t.pending,s=e.memoizedState;if(r!==null){t.pending=null;var a=r=r.next;do s=n(s,a.action),a=a.next;while(a!==r);yr(s,e.memoizedState)||(hi=!0),e.memoizedState=s,e.baseQueue===null&&(e.baseState=s),t.lastRenderedState=s}return[s,i]}function W1(){}function X1(n,e){var t=Wt,i=ar(),r=e(),s=!yr(i.memoizedState,r);if(s&&(i.memoizedState=r,hi=!0),i=i.queue,_0($1.bind(null,t,i,n),[n]),i.getSnapshot!==e||s||An!==null&&An.memoizedState.tag&1){if(t.flags|=2048,Wu(9,q1.bind(null,t,i,r,e),void 0,null),Cn===null)throw Error(fe(349));Ya&30||Y1(t,e,r)}return r}function Y1(n,e,t){n.flags|=16384,n={getSnapshot:e,value:t},e=Wt.updateQueue,e===null?(e={lastEffect:null,stores:null},Wt.updateQueue=e,e.stores=[n]):(t=e.stores,t===null?e.stores=[n]:t.push(n))}function q1(n,e,t,i){e.value=t,e.getSnapshot=i,K1(e)&&Z1(n)}function $1(n,e,t){return t(function(){K1(e)&&Z1(n)})}function K1(n){var e=n.getSnapshot;n=n.value;try{var t=e();return!yr(n,t)}catch{return!0}}function Z1(n){var e=ps(n,1);e!==null&&xr(e,n,1,-1)}function ov(n){var e=Cr();return typeof n=="function"&&(n=n()),e.memoizedState=e.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Gu,lastRenderedState:n},e.queue=n,n=n.dispatch=Xw.bind(null,Wt,n),[e.memoizedState,n]}function Wu(n,e,t,i){return n={tag:n,create:e,destroy:t,deps:i,next:null},e=Wt.updateQueue,e===null?(e={lastEffect:null,stores:null},Wt.updateQueue=e,e.lastEffect=n.next=n):(t=e.lastEffect,t===null?e.lastEffect=n.next=n:(i=t.next,t.next=n,n.next=i,e.lastEffect=n)),n}function j1(){return ar().memoizedState}function Ef(n,e,t,i){var r=Cr();Wt.flags|=n,r.memoizedState=Wu(1|e,t,void 0,i===void 0?null:i)}function Bd(n,e,t,i){var r=ar();i=i===void 0?null:i;var s=void 0;if(gn!==null){var a=gn.memoizedState;if(s=a.destroy,i!==null&&p0(i,a.deps)){r.memoizedState=Wu(e,t,s,i);return}}Wt.flags|=n,r.memoizedState=Wu(1|e,t,s,i)}function lv(n,e){return Ef(8390656,8,n,e)}function _0(n,e){return Bd(2048,8,n,e)}function Q1(n,e){return Bd(4,2,n,e)}function J1(n,e){return Bd(4,4,n,e)}function eS(n,e){if(typeof e=="function")return n=n(),e(n),function(){e(null)};if(e!=null)return n=n(),e.current=n,function(){e.current=null}}function tS(n,e,t){return t=t!=null?t.concat([n]):null,Bd(4,4,eS.bind(null,e,n),t)}function v0(){}function nS(n,e){var t=ar();e=e===void 0?null:e;var i=t.memoizedState;return i!==null&&e!==null&&p0(e,i[1])?i[0]:(t.memoizedState=[n,e],n)}function iS(n,e){var t=ar();e=e===void 0?null:e;var i=t.memoizedState;return i!==null&&e!==null&&p0(e,i[1])?i[0]:(n=n(),t.memoizedState=[n,e],n)}function rS(n,e,t){return Ya&21?(yr(t,e)||(t=u1(),Wt.lanes|=t,qa|=t,n.baseState=!0),e):(n.baseState&&(n.baseState=!1,hi=!0),n.memoizedState=t)}function Gw(n,e){var t=Et;Et=t!==0&&4>t?t:4,n(!0);var i=Sh.transition;Sh.transition={};try{n(!1),e()}finally{Et=t,Sh.transition=i}}function sS(){return ar().memoizedState}function Ww(n,e,t){var i=Qs(n);if(t={lane:i,action:t,hasEagerState:!1,eagerState:null,next:null},aS(n))oS(e,t);else if(t=V1(n,e,t,i),t!==null){var r=si();xr(t,n,i,r),lS(t,e,i)}}function Xw(n,e,t){var i=Qs(n),r={lane:i,action:t,hasEagerState:!1,eagerState:null,next:null};if(aS(n))oS(e,r);else{var s=n.alternate;if(n.lanes===0&&(s===null||s.lanes===0)&&(s=e.lastRenderedReducer,s!==null))try{var a=e.lastRenderedState,o=s(a,t);if(r.hasEagerState=!0,r.eagerState=o,yr(o,a)){var l=e.interleaved;l===null?(r.next=r,u0(e)):(r.next=l.next,l.next=r),e.interleaved=r;return}}catch{}finally{}t=V1(n,e,r,i),t!==null&&(r=si(),xr(t,n,i,r),lS(t,e,i))}}function aS(n){var e=n.alternate;return n===Wt||e!==null&&e===Wt}function oS(n,e){du=ad=!0;var t=n.pending;t===null?e.next=e:(e.next=t.next,t.next=e),n.pending=e}function lS(n,e,t){if(t&4194240){var i=e.lanes;i&=n.pendingLanes,t|=i,e.lanes=t,Kg(n,t)}}var od={readContext:sr,useCallback:On,useContext:On,useEffect:On,useImperativeHandle:On,useInsertionEffect:On,useLayoutEffect:On,useMemo:On,useReducer:On,useRef:On,useState:On,useDebugValue:On,useDeferredValue:On,useTransition:On,useMutableSource:On,useSyncExternalStore:On,useId:On,unstable_isNewReconciler:!1},Yw={readContext:sr,useCallback:function(n,e){return Cr().memoizedState=[n,e===void 0?null:e],n},useContext:sr,useEffect:lv,useImperativeHandle:function(n,e,t){return t=t!=null?t.concat([n]):null,Ef(4194308,4,eS.bind(null,e,n),t)},useLayoutEffect:function(n,e){return Ef(4194308,4,n,e)},useInsertionEffect:function(n,e){return Ef(4,2,n,e)},useMemo:function(n,e){var t=Cr();return e=e===void 0?null:e,n=n(),t.memoizedState=[n,e],n},useReducer:function(n,e,t){var i=Cr();return e=t!==void 0?t(e):e,i.memoizedState=i.baseState=e,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:e},i.queue=n,n=n.dispatch=Ww.bind(null,Wt,n),[i.memoizedState,n]},useRef:function(n){var e=Cr();return n={current:n},e.memoizedState=n},useState:ov,useDebugValue:v0,useDeferredValue:function(n){return Cr().memoizedState=n},useTransition:function(){var n=ov(!1),e=n[0];return n=Gw.bind(null,n[1]),Cr().memoizedState=n,[e,n]},useMutableSource:function(){},useSyncExternalStore:function(n,e,t){var i=Wt,r=Cr();if(kt){if(t===void 0)throw Error(fe(407));t=t()}else{if(t=e(),Cn===null)throw Error(fe(349));Ya&30||Y1(i,e,t)}r.memoizedState=t;var s={value:t,getSnapshot:e};return r.queue=s,lv($1.bind(null,i,s,n),[n]),i.flags|=2048,Wu(9,q1.bind(null,i,s,t,e),void 0,null),t},useId:function(){var n=Cr(),e=Cn.identifierPrefix;if(kt){var t=rs,i=is;t=(i&~(1<<32-vr(i)-1)).toString(32)+t,e=":"+e+"R"+t,t=Hu++,0<t&&(e+="H"+t.toString(32)),e+=":"}else t=Hw++,e=":"+e+"r"+t.toString(32)+":";return n.memoizedState=e},unstable_isNewReconciler:!1},qw={readContext:sr,useCallback:nS,useContext:sr,useEffect:_0,useImperativeHandle:tS,useInsertionEffect:Q1,useLayoutEffect:J1,useMemo:iS,useReducer:Mh,useRef:j1,useState:function(){return Mh(Gu)},useDebugValue:v0,useDeferredValue:function(n){var e=ar();return rS(e,gn.memoizedState,n)},useTransition:function(){var n=Mh(Gu)[0],e=ar().memoizedState;return[n,e]},useMutableSource:W1,useSyncExternalStore:X1,useId:sS,unstable_isNewReconciler:!1},$w={readContext:sr,useCallback:nS,useContext:sr,useEffect:_0,useImperativeHandle:tS,useInsertionEffect:Q1,useLayoutEffect:J1,useMemo:iS,useReducer:Eh,useRef:j1,useState:function(){return Eh(Gu)},useDebugValue:v0,useDeferredValue:function(n){var e=ar();return gn===null?e.memoizedState=n:rS(e,gn.memoizedState,n)},useTransition:function(){var n=Eh(Gu)[0],e=ar().memoizedState;return[n,e]},useMutableSource:W1,useSyncExternalStore:X1,useId:sS,unstable_isNewReconciler:!1};function dr(n,e){if(n&&n.defaultProps){e=Xt({},e),n=n.defaultProps;for(var t in n)e[t]===void 0&&(e[t]=n[t]);return e}return e}function sm(n,e,t,i){e=n.memoizedState,t=t(i,e),t=t==null?e:Xt({},e,t),n.memoizedState=t,n.lanes===0&&(n.updateQueue.baseState=t)}var zd={isMounted:function(n){return(n=n._reactInternals)?to(n)===n:!1},enqueueSetState:function(n,e,t){n=n._reactInternals;var i=si(),r=Qs(n),s=os(i,r);s.payload=e,t!=null&&(s.callback=t),e=Zs(n,s,r),e!==null&&(xr(e,n,r,i),Sf(e,n,r))},enqueueReplaceState:function(n,e,t){n=n._reactInternals;var i=si(),r=Qs(n),s=os(i,r);s.tag=1,s.payload=e,t!=null&&(s.callback=t),e=Zs(n,s,r),e!==null&&(xr(e,n,r,i),Sf(e,n,r))},enqueueForceUpdate:function(n,e){n=n._reactInternals;var t=si(),i=Qs(n),r=os(t,i);r.tag=2,e!=null&&(r.callback=e),e=Zs(n,r,i),e!==null&&(xr(e,n,i,t),Sf(e,n,i))}};function uv(n,e,t,i,r,s,a){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(i,s,a):e.prototype&&e.prototype.isPureReactComponent?!Fu(t,i)||!Fu(r,s):!0}function uS(n,e,t){var i=!1,r=ra,s=e.contextType;return typeof s=="object"&&s!==null?s=sr(s):(r=mi(e)?Wa:$n.current,i=e.contextTypes,s=(i=i!=null)?ll(n,r):ra),e=new e(t,s),n.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=zd,n.stateNode=e,e._reactInternals=n,i&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=r,n.__reactInternalMemoizedMaskedChildContext=s),e}function cv(n,e,t,i){n=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(t,i),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(t,i),e.state!==n&&zd.enqueueReplaceState(e,e.state,null)}function am(n,e,t,i){var r=n.stateNode;r.props=t,r.state=n.memoizedState,r.refs={},c0(n);var s=e.contextType;typeof s=="object"&&s!==null?r.context=sr(s):(s=mi(e)?Wa:$n.current,r.context=ll(n,s)),r.state=n.memoizedState,s=e.getDerivedStateFromProps,typeof s=="function"&&(sm(n,e,s,t),r.state=n.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof r.getSnapshotBeforeUpdate=="function"||typeof r.UNSAFE_componentWillMount!="function"&&typeof r.componentWillMount!="function"||(e=r.state,typeof r.componentWillMount=="function"&&r.componentWillMount(),typeof r.UNSAFE_componentWillMount=="function"&&r.UNSAFE_componentWillMount(),e!==r.state&&zd.enqueueReplaceState(r,r.state,null),rd(n,t,r,i),r.state=n.memoizedState),typeof r.componentDidMount=="function"&&(n.flags|=4194308)}function dl(n,e){try{var t="",i=e;do t+=MT(i),i=i.return;while(i);var r=t}catch(s){r=`
Error generating stack: `+s.message+`
`+s.stack}return{value:n,source:e,stack:r,digest:null}}function Th(n,e,t){return{value:n,source:null,stack:t??null,digest:e??null}}function om(n,e){try{console.error(e.value)}catch(t){setTimeout(function(){throw t})}}var Kw=typeof WeakMap=="function"?WeakMap:Map;function cS(n,e,t){t=os(-1,t),t.tag=3,t.payload={element:null};var i=e.value;return t.callback=function(){ud||(ud=!0,_m=i),om(n,e)},t}function fS(n,e,t){t=os(-1,t),t.tag=3;var i=n.type.getDerivedStateFromError;if(typeof i=="function"){var r=e.value;t.payload=function(){return i(r)},t.callback=function(){om(n,e)}}var s=n.stateNode;return s!==null&&typeof s.componentDidCatch=="function"&&(t.callback=function(){om(n,e),typeof i!="function"&&(js===null?js=new Set([this]):js.add(this));var a=e.stack;this.componentDidCatch(e.value,{componentStack:a!==null?a:""})}),t}function fv(n,e,t){var i=n.pingCache;if(i===null){i=n.pingCache=new Kw;var r=new Set;i.set(e,r)}else r=i.get(e),r===void 0&&(r=new Set,i.set(e,r));r.has(t)||(r.add(t),n=uA.bind(null,n,e,t),e.then(n,n))}function dv(n){do{var e;if((e=n.tag===13)&&(e=n.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return n;n=n.return}while(n!==null);return null}function hv(n,e,t,i,r){return n.mode&1?(n.flags|=65536,n.lanes=r,n):(n===e?n.flags|=65536:(n.flags|=128,t.flags|=131072,t.flags&=-52805,t.tag===1&&(t.alternate===null?t.tag=17:(e=os(-1,1),e.tag=2,Zs(t,e,1))),t.lanes|=1),n)}var Zw=ys.ReactCurrentOwner,hi=!1;function ti(n,e,t,i){e.child=n===null?z1(e,null,t,i):cl(e,n.child,t,i)}function pv(n,e,t,i,r){t=t.render;var s=e.ref;return Ko(e,r),i=m0(n,e,t,i,s,r),t=g0(),n!==null&&!hi?(e.updateQueue=n.updateQueue,e.flags&=-2053,n.lanes&=~r,ms(n,e,r)):(kt&&t&&i0(e),e.flags|=1,ti(n,e,i,r),e.child)}function mv(n,e,t,i,r){if(n===null){var s=t.type;return typeof s=="function"&&!A0(s)&&s.defaultProps===void 0&&t.compare===null&&t.defaultProps===void 0?(e.tag=15,e.type=s,dS(n,e,s,i,r)):(n=Cf(t.type,null,i,e,e.mode,r),n.ref=e.ref,n.return=e,e.child=n)}if(s=n.child,!(n.lanes&r)){var a=s.memoizedProps;if(t=t.compare,t=t!==null?t:Fu,t(a,i)&&n.ref===e.ref)return ms(n,e,r)}return e.flags|=1,n=Js(s,i),n.ref=e.ref,n.return=e,e.child=n}function dS(n,e,t,i,r){if(n!==null){var s=n.memoizedProps;if(Fu(s,i)&&n.ref===e.ref)if(hi=!1,e.pendingProps=i=s,(n.lanes&r)!==0)n.flags&131072&&(hi=!0);else return e.lanes=n.lanes,ms(n,e,r)}return lm(n,e,t,i,r)}function hS(n,e,t){var i=e.pendingProps,r=i.children,s=n!==null?n.memoizedState:null;if(i.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},Nt(Vo,Ci),Ci|=t;else{if(!(t&1073741824))return n=s!==null?s.baseLanes|t:t,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:n,cachePool:null,transitions:null},e.updateQueue=null,Nt(Vo,Ci),Ci|=n,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},i=s!==null?s.baseLanes:t,Nt(Vo,Ci),Ci|=i}else s!==null?(i=s.baseLanes|t,e.memoizedState=null):i=t,Nt(Vo,Ci),Ci|=i;return ti(n,e,r,t),e.child}function pS(n,e){var t=e.ref;(n===null&&t!==null||n!==null&&n.ref!==t)&&(e.flags|=512,e.flags|=2097152)}function lm(n,e,t,i,r){var s=mi(t)?Wa:$n.current;return s=ll(e,s),Ko(e,r),t=m0(n,e,t,i,s,r),i=g0(),n!==null&&!hi?(e.updateQueue=n.updateQueue,e.flags&=-2053,n.lanes&=~r,ms(n,e,r)):(kt&&i&&i0(e),e.flags|=1,ti(n,e,t,r),e.child)}function gv(n,e,t,i,r){if(mi(t)){var s=!0;Jf(e)}else s=!1;if(Ko(e,r),e.stateNode===null)Tf(n,e),uS(e,t,i),am(e,t,i,r),i=!0;else if(n===null){var a=e.stateNode,o=e.memoizedProps;a.props=o;var l=a.context,u=t.contextType;typeof u=="object"&&u!==null?u=sr(u):(u=mi(t)?Wa:$n.current,u=ll(e,u));var c=t.getDerivedStateFromProps,d=typeof c=="function"||typeof a.getSnapshotBeforeUpdate=="function";d||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(o!==i||l!==u)&&cv(e,a,i,u),Is=!1;var f=e.memoizedState;a.state=f,rd(e,i,a,r),l=e.memoizedState,o!==i||f!==l||pi.current||Is?(typeof c=="function"&&(sm(e,t,c,i),l=e.memoizedState),(o=Is||uv(e,t,o,i,f,l,u))?(d||typeof a.UNSAFE_componentWillMount!="function"&&typeof a.componentWillMount!="function"||(typeof a.componentWillMount=="function"&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount=="function"&&a.UNSAFE_componentWillMount()),typeof a.componentDidMount=="function"&&(e.flags|=4194308)):(typeof a.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=i,e.memoizedState=l),a.props=i,a.state=l,a.context=u,i=o):(typeof a.componentDidMount=="function"&&(e.flags|=4194308),i=!1)}else{a=e.stateNode,H1(n,e),o=e.memoizedProps,u=e.type===e.elementType?o:dr(e.type,o),a.props=u,d=e.pendingProps,f=a.context,l=t.contextType,typeof l=="object"&&l!==null?l=sr(l):(l=mi(t)?Wa:$n.current,l=ll(e,l));var h=t.getDerivedStateFromProps;(c=typeof h=="function"||typeof a.getSnapshotBeforeUpdate=="function")||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(o!==d||f!==l)&&cv(e,a,i,l),Is=!1,f=e.memoizedState,a.state=f,rd(e,i,a,r);var m=e.memoizedState;o!==d||f!==m||pi.current||Is?(typeof h=="function"&&(sm(e,t,h,i),m=e.memoizedState),(u=Is||uv(e,t,u,i,f,m,l)||!1)?(c||typeof a.UNSAFE_componentWillUpdate!="function"&&typeof a.componentWillUpdate!="function"||(typeof a.componentWillUpdate=="function"&&a.componentWillUpdate(i,m,l),typeof a.UNSAFE_componentWillUpdate=="function"&&a.UNSAFE_componentWillUpdate(i,m,l)),typeof a.componentDidUpdate=="function"&&(e.flags|=4),typeof a.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof a.componentDidUpdate!="function"||o===n.memoizedProps&&f===n.memoizedState||(e.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||o===n.memoizedProps&&f===n.memoizedState||(e.flags|=1024),e.memoizedProps=i,e.memoizedState=m),a.props=i,a.state=m,a.context=l,i=u):(typeof a.componentDidUpdate!="function"||o===n.memoizedProps&&f===n.memoizedState||(e.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||o===n.memoizedProps&&f===n.memoizedState||(e.flags|=1024),i=!1)}return um(n,e,t,i,s,r)}function um(n,e,t,i,r,s){pS(n,e);var a=(e.flags&128)!==0;if(!i&&!a)return r&&tv(e,t,!1),ms(n,e,s);i=e.stateNode,Zw.current=e;var o=a&&typeof t.getDerivedStateFromError!="function"?null:i.render();return e.flags|=1,n!==null&&a?(e.child=cl(e,n.child,null,s),e.child=cl(e,null,o,s)):ti(n,e,o,s),e.memoizedState=i.state,r&&tv(e,t,!0),e.child}function mS(n){var e=n.stateNode;e.pendingContext?ev(n,e.pendingContext,e.pendingContext!==e.context):e.context&&ev(n,e.context,!1),f0(n,e.containerInfo)}function _v(n,e,t,i,r){return ul(),s0(r),e.flags|=256,ti(n,e,t,i),e.child}var cm={dehydrated:null,treeContext:null,retryLane:0};function fm(n){return{baseLanes:n,cachePool:null,transitions:null}}function gS(n,e,t){var i=e.pendingProps,r=Vt.current,s=!1,a=(e.flags&128)!==0,o;if((o=a)||(o=n!==null&&n.memoizedState===null?!1:(r&2)!==0),o?(s=!0,e.flags&=-129):(n===null||n.memoizedState!==null)&&(r|=1),Nt(Vt,r&1),n===null)return im(e),n=e.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?(e.mode&1?n.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(a=i.children,n=i.fallback,s?(i=e.mode,s=e.child,a={mode:"hidden",children:a},!(i&1)&&s!==null?(s.childLanes=0,s.pendingProps=a):s=Gd(a,i,0,null),n=Fa(n,i,t,null),s.return=e,n.return=e,s.sibling=n,e.child=s,e.child.memoizedState=fm(t),e.memoizedState=cm,n):x0(e,a));if(r=n.memoizedState,r!==null&&(o=r.dehydrated,o!==null))return jw(n,e,a,i,o,r,t);if(s){s=i.fallback,a=e.mode,r=n.child,o=r.sibling;var l={mode:"hidden",children:i.children};return!(a&1)&&e.child!==r?(i=e.child,i.childLanes=0,i.pendingProps=l,e.deletions=null):(i=Js(r,l),i.subtreeFlags=r.subtreeFlags&14680064),o!==null?s=Js(o,s):(s=Fa(s,a,t,null),s.flags|=2),s.return=e,i.return=e,i.sibling=s,e.child=i,i=s,s=e.child,a=n.child.memoizedState,a=a===null?fm(t):{baseLanes:a.baseLanes|t,cachePool:null,transitions:a.transitions},s.memoizedState=a,s.childLanes=n.childLanes&~t,e.memoizedState=cm,i}return s=n.child,n=s.sibling,i=Js(s,{mode:"visible",children:i.children}),!(e.mode&1)&&(i.lanes=t),i.return=e,i.sibling=null,n!==null&&(t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)),e.child=i,e.memoizedState=null,i}function x0(n,e){return e=Gd({mode:"visible",children:e},n.mode,0,null),e.return=n,n.child=e}function Rc(n,e,t,i){return i!==null&&s0(i),cl(e,n.child,null,t),n=x0(e,e.pendingProps.children),n.flags|=2,e.memoizedState=null,n}function jw(n,e,t,i,r,s,a){if(t)return e.flags&256?(e.flags&=-257,i=Th(Error(fe(422))),Rc(n,e,a,i)):e.memoizedState!==null?(e.child=n.child,e.flags|=128,null):(s=i.fallback,r=e.mode,i=Gd({mode:"visible",children:i.children},r,0,null),s=Fa(s,r,a,null),s.flags|=2,i.return=e,s.return=e,i.sibling=s,e.child=i,e.mode&1&&cl(e,n.child,null,a),e.child.memoizedState=fm(a),e.memoizedState=cm,s);if(!(e.mode&1))return Rc(n,e,a,null);if(r.data==="$!"){if(i=r.nextSibling&&r.nextSibling.dataset,i)var o=i.dgst;return i=o,s=Error(fe(419)),i=Th(s,i,void 0),Rc(n,e,a,i)}if(o=(a&n.childLanes)!==0,hi||o){if(i=Cn,i!==null){switch(a&-a){case 4:r=2;break;case 16:r=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:r=32;break;case 536870912:r=268435456;break;default:r=0}r=r&(i.suspendedLanes|a)?0:r,r!==0&&r!==s.retryLane&&(s.retryLane=r,ps(n,r),xr(i,n,r,-1))}return w0(),i=Th(Error(fe(421))),Rc(n,e,a,i)}return r.data==="$?"?(e.flags|=128,e.child=n.child,e=cA.bind(null,n),r._reactRetry=e,null):(n=s.treeContext,Ii=Ks(r.nextSibling),Oi=e,kt=!0,pr=null,n!==null&&(Ki[Zi++]=is,Ki[Zi++]=rs,Ki[Zi++]=Xa,is=n.id,rs=n.overflow,Xa=e),e=x0(e,i.children),e.flags|=4096,e)}function vv(n,e,t){n.lanes|=e;var i=n.alternate;i!==null&&(i.lanes|=e),rm(n.return,e,t)}function wh(n,e,t,i,r){var s=n.memoizedState;s===null?n.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:i,tail:t,tailMode:r}:(s.isBackwards=e,s.rendering=null,s.renderingStartTime=0,s.last=i,s.tail=t,s.tailMode=r)}function _S(n,e,t){var i=e.pendingProps,r=i.revealOrder,s=i.tail;if(ti(n,e,i.children,t),i=Vt.current,i&2)i=i&1|2,e.flags|=128;else{if(n!==null&&n.flags&128)e:for(n=e.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&vv(n,t,e);else if(n.tag===19)vv(n,t,e);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break e;for(;n.sibling===null;){if(n.return===null||n.return===e)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}i&=1}if(Nt(Vt,i),!(e.mode&1))e.memoizedState=null;else switch(r){case"forwards":for(t=e.child,r=null;t!==null;)n=t.alternate,n!==null&&sd(n)===null&&(r=t),t=t.sibling;t=r,t===null?(r=e.child,e.child=null):(r=t.sibling,t.sibling=null),wh(e,!1,r,t,s);break;case"backwards":for(t=null,r=e.child,e.child=null;r!==null;){if(n=r.alternate,n!==null&&sd(n)===null){e.child=r;break}n=r.sibling,r.sibling=t,t=r,r=n}wh(e,!0,t,null,s);break;case"together":wh(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function Tf(n,e){!(e.mode&1)&&n!==null&&(n.alternate=null,e.alternate=null,e.flags|=2)}function ms(n,e,t){if(n!==null&&(e.dependencies=n.dependencies),qa|=e.lanes,!(t&e.childLanes))return null;if(n!==null&&e.child!==n.child)throw Error(fe(153));if(e.child!==null){for(n=e.child,t=Js(n,n.pendingProps),e.child=t,t.return=e;n.sibling!==null;)n=n.sibling,t=t.sibling=Js(n,n.pendingProps),t.return=e;t.sibling=null}return e.child}function Qw(n,e,t){switch(e.tag){case 3:mS(e),ul();break;case 5:G1(e);break;case 1:mi(e.type)&&Jf(e);break;case 4:f0(e,e.stateNode.containerInfo);break;case 10:var i=e.type._context,r=e.memoizedProps.value;Nt(nd,i._currentValue),i._currentValue=r;break;case 13:if(i=e.memoizedState,i!==null)return i.dehydrated!==null?(Nt(Vt,Vt.current&1),e.flags|=128,null):t&e.child.childLanes?gS(n,e,t):(Nt(Vt,Vt.current&1),n=ms(n,e,t),n!==null?n.sibling:null);Nt(Vt,Vt.current&1);break;case 19:if(i=(t&e.childLanes)!==0,n.flags&128){if(i)return _S(n,e,t);e.flags|=128}if(r=e.memoizedState,r!==null&&(r.rendering=null,r.tail=null,r.lastEffect=null),Nt(Vt,Vt.current),i)break;return null;case 22:case 23:return e.lanes=0,hS(n,e,t)}return ms(n,e,t)}var vS,dm,xS,yS;vS=function(n,e){for(var t=e.child;t!==null;){if(t.tag===5||t.tag===6)n.appendChild(t.stateNode);else if(t.tag!==4&&t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return;t=t.return}t.sibling.return=t.return,t=t.sibling}};dm=function(){};xS=function(n,e,t,i){var r=n.memoizedProps;if(r!==i){n=e.stateNode,Pa(kr.current);var s=null;switch(t){case"input":r=Ip(n,r),i=Ip(n,i),s=[];break;case"select":r=Xt({},r,{value:void 0}),i=Xt({},i,{value:void 0}),s=[];break;case"textarea":r=Op(n,r),i=Op(n,i),s=[];break;default:typeof r.onClick!="function"&&typeof i.onClick=="function"&&(n.onclick=jf)}Bp(t,i);var a;t=null;for(u in r)if(!i.hasOwnProperty(u)&&r.hasOwnProperty(u)&&r[u]!=null)if(u==="style"){var o=r[u];for(a in o)o.hasOwnProperty(a)&&(t||(t={}),t[a]="")}else u!=="dangerouslySetInnerHTML"&&u!=="children"&&u!=="suppressContentEditableWarning"&&u!=="suppressHydrationWarning"&&u!=="autoFocus"&&(bu.hasOwnProperty(u)?s||(s=[]):(s=s||[]).push(u,null));for(u in i){var l=i[u];if(o=r!=null?r[u]:void 0,i.hasOwnProperty(u)&&l!==o&&(l!=null||o!=null))if(u==="style")if(o){for(a in o)!o.hasOwnProperty(a)||l&&l.hasOwnProperty(a)||(t||(t={}),t[a]="");for(a in l)l.hasOwnProperty(a)&&o[a]!==l[a]&&(t||(t={}),t[a]=l[a])}else t||(s||(s=[]),s.push(u,t)),t=l;else u==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,o=o?o.__html:void 0,l!=null&&o!==l&&(s=s||[]).push(u,l)):u==="children"?typeof l!="string"&&typeof l!="number"||(s=s||[]).push(u,""+l):u!=="suppressContentEditableWarning"&&u!=="suppressHydrationWarning"&&(bu.hasOwnProperty(u)?(l!=null&&u==="onScroll"&&Ft("scroll",n),s||o===l||(s=[])):(s=s||[]).push(u,l))}t&&(s=s||[]).push("style",t);var u=s;(e.updateQueue=u)&&(e.flags|=4)}};yS=function(n,e,t,i){t!==i&&(e.flags|=4)};function Ul(n,e){if(!kt)switch(n.tailMode){case"hidden":e=n.tail;for(var t=null;e!==null;)e.alternate!==null&&(t=e),e=e.sibling;t===null?n.tail=null:t.sibling=null;break;case"collapsed":t=n.tail;for(var i=null;t!==null;)t.alternate!==null&&(i=t),t=t.sibling;i===null?e||n.tail===null?n.tail=null:n.tail.sibling=null:i.sibling=null}}function kn(n){var e=n.alternate!==null&&n.alternate.child===n.child,t=0,i=0;if(e)for(var r=n.child;r!==null;)t|=r.lanes|r.childLanes,i|=r.subtreeFlags&14680064,i|=r.flags&14680064,r.return=n,r=r.sibling;else for(r=n.child;r!==null;)t|=r.lanes|r.childLanes,i|=r.subtreeFlags,i|=r.flags,r.return=n,r=r.sibling;return n.subtreeFlags|=i,n.childLanes=t,e}function Jw(n,e,t){var i=e.pendingProps;switch(r0(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return kn(e),null;case 1:return mi(e.type)&&Qf(),kn(e),null;case 3:return i=e.stateNode,fl(),Ot(pi),Ot($n),h0(),i.pendingContext&&(i.context=i.pendingContext,i.pendingContext=null),(n===null||n.child===null)&&(Ac(e)?e.flags|=4:n===null||n.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,pr!==null&&(ym(pr),pr=null))),dm(n,e),kn(e),null;case 5:d0(e);var r=Pa(Vu.current);if(t=e.type,n!==null&&e.stateNode!=null)xS(n,e,t,i,r),n.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!i){if(e.stateNode===null)throw Error(fe(166));return kn(e),null}if(n=Pa(kr.current),Ac(e)){i=e.stateNode,t=e.type;var s=e.memoizedProps;switch(i[Dr]=e,i[Bu]=s,n=(e.mode&1)!==0,t){case"dialog":Ft("cancel",i),Ft("close",i);break;case"iframe":case"object":case"embed":Ft("load",i);break;case"video":case"audio":for(r=0;r<jl.length;r++)Ft(jl[r],i);break;case"source":Ft("error",i);break;case"img":case"image":case"link":Ft("error",i),Ft("load",i);break;case"details":Ft("toggle",i);break;case"input":C_(i,s),Ft("invalid",i);break;case"select":i._wrapperState={wasMultiple:!!s.multiple},Ft("invalid",i);break;case"textarea":b_(i,s),Ft("invalid",i)}Bp(t,s),r=null;for(var a in s)if(s.hasOwnProperty(a)){var o=s[a];a==="children"?typeof o=="string"?i.textContent!==o&&(s.suppressHydrationWarning!==!0&&wc(i.textContent,o,n),r=["children",o]):typeof o=="number"&&i.textContent!==""+o&&(s.suppressHydrationWarning!==!0&&wc(i.textContent,o,n),r=["children",""+o]):bu.hasOwnProperty(a)&&o!=null&&a==="onScroll"&&Ft("scroll",i)}switch(t){case"input":_c(i),R_(i,s,!0);break;case"textarea":_c(i),P_(i);break;case"select":case"option":break;default:typeof s.onClick=="function"&&(i.onclick=jf)}i=r,e.updateQueue=i,i!==null&&(e.flags|=4)}else{a=r.nodeType===9?r:r.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=$y(t)),n==="http://www.w3.org/1999/xhtml"?t==="script"?(n=a.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof i.is=="string"?n=a.createElement(t,{is:i.is}):(n=a.createElement(t),t==="select"&&(a=n,i.multiple?a.multiple=!0:i.size&&(a.size=i.size))):n=a.createElementNS(n,t),n[Dr]=e,n[Bu]=i,vS(n,e,!1,!1),e.stateNode=n;e:{switch(a=zp(t,i),t){case"dialog":Ft("cancel",n),Ft("close",n),r=i;break;case"iframe":case"object":case"embed":Ft("load",n),r=i;break;case"video":case"audio":for(r=0;r<jl.length;r++)Ft(jl[r],n);r=i;break;case"source":Ft("error",n),r=i;break;case"img":case"image":case"link":Ft("error",n),Ft("load",n),r=i;break;case"details":Ft("toggle",n),r=i;break;case"input":C_(n,i),r=Ip(n,i),Ft("invalid",n);break;case"option":r=i;break;case"select":n._wrapperState={wasMultiple:!!i.multiple},r=Xt({},i,{value:void 0}),Ft("invalid",n);break;case"textarea":b_(n,i),r=Op(n,i),Ft("invalid",n);break;default:r=i}Bp(t,r),o=r;for(s in o)if(o.hasOwnProperty(s)){var l=o[s];s==="style"?jy(n,l):s==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,l!=null&&Ky(n,l)):s==="children"?typeof l=="string"?(t!=="textarea"||l!=="")&&Pu(n,l):typeof l=="number"&&Pu(n,""+l):s!=="suppressContentEditableWarning"&&s!=="suppressHydrationWarning"&&s!=="autoFocus"&&(bu.hasOwnProperty(s)?l!=null&&s==="onScroll"&&Ft("scroll",n):l!=null&&Gg(n,s,l,a))}switch(t){case"input":_c(n),R_(n,i,!1);break;case"textarea":_c(n),P_(n);break;case"option":i.value!=null&&n.setAttribute("value",""+ia(i.value));break;case"select":n.multiple=!!i.multiple,s=i.value,s!=null?Xo(n,!!i.multiple,s,!1):i.defaultValue!=null&&Xo(n,!!i.multiple,i.defaultValue,!0);break;default:typeof r.onClick=="function"&&(n.onclick=jf)}switch(t){case"button":case"input":case"select":case"textarea":i=!!i.autoFocus;break e;case"img":i=!0;break e;default:i=!1}}i&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return kn(e),null;case 6:if(n&&e.stateNode!=null)yS(n,e,n.memoizedProps,i);else{if(typeof i!="string"&&e.stateNode===null)throw Error(fe(166));if(t=Pa(Vu.current),Pa(kr.current),Ac(e)){if(i=e.stateNode,t=e.memoizedProps,i[Dr]=e,(s=i.nodeValue!==t)&&(n=Oi,n!==null))switch(n.tag){case 3:wc(i.nodeValue,t,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&wc(i.nodeValue,t,(n.mode&1)!==0)}s&&(e.flags|=4)}else i=(t.nodeType===9?t:t.ownerDocument).createTextNode(i),i[Dr]=e,e.stateNode=i}return kn(e),null;case 13:if(Ot(Vt),i=e.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(kt&&Ii!==null&&e.mode&1&&!(e.flags&128))k1(),ul(),e.flags|=98560,s=!1;else if(s=Ac(e),i!==null&&i.dehydrated!==null){if(n===null){if(!s)throw Error(fe(318));if(s=e.memoizedState,s=s!==null?s.dehydrated:null,!s)throw Error(fe(317));s[Dr]=e}else ul(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;kn(e),s=!1}else pr!==null&&(ym(pr),pr=null),s=!0;if(!s)return e.flags&65536?e:null}return e.flags&128?(e.lanes=t,e):(i=i!==null,i!==(n!==null&&n.memoizedState!==null)&&i&&(e.child.flags|=8192,e.mode&1&&(n===null||Vt.current&1?vn===0&&(vn=3):w0())),e.updateQueue!==null&&(e.flags|=4),kn(e),null);case 4:return fl(),dm(n,e),n===null&&Ou(e.stateNode.containerInfo),kn(e),null;case 10:return l0(e.type._context),kn(e),null;case 17:return mi(e.type)&&Qf(),kn(e),null;case 19:if(Ot(Vt),s=e.memoizedState,s===null)return kn(e),null;if(i=(e.flags&128)!==0,a=s.rendering,a===null)if(i)Ul(s,!1);else{if(vn!==0||n!==null&&n.flags&128)for(n=e.child;n!==null;){if(a=sd(n),a!==null){for(e.flags|=128,Ul(s,!1),i=a.updateQueue,i!==null&&(e.updateQueue=i,e.flags|=4),e.subtreeFlags=0,i=t,t=e.child;t!==null;)s=t,n=i,s.flags&=14680066,a=s.alternate,a===null?(s.childLanes=0,s.lanes=n,s.child=null,s.subtreeFlags=0,s.memoizedProps=null,s.memoizedState=null,s.updateQueue=null,s.dependencies=null,s.stateNode=null):(s.childLanes=a.childLanes,s.lanes=a.lanes,s.child=a.child,s.subtreeFlags=0,s.deletions=null,s.memoizedProps=a.memoizedProps,s.memoizedState=a.memoizedState,s.updateQueue=a.updateQueue,s.type=a.type,n=a.dependencies,s.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),t=t.sibling;return Nt(Vt,Vt.current&1|2),e.child}n=n.sibling}s.tail!==null&&nn()>hl&&(e.flags|=128,i=!0,Ul(s,!1),e.lanes=4194304)}else{if(!i)if(n=sd(a),n!==null){if(e.flags|=128,i=!0,t=n.updateQueue,t!==null&&(e.updateQueue=t,e.flags|=4),Ul(s,!0),s.tail===null&&s.tailMode==="hidden"&&!a.alternate&&!kt)return kn(e),null}else 2*nn()-s.renderingStartTime>hl&&t!==1073741824&&(e.flags|=128,i=!0,Ul(s,!1),e.lanes=4194304);s.isBackwards?(a.sibling=e.child,e.child=a):(t=s.last,t!==null?t.sibling=a:e.child=a,s.last=a)}return s.tail!==null?(e=s.tail,s.rendering=e,s.tail=e.sibling,s.renderingStartTime=nn(),e.sibling=null,t=Vt.current,Nt(Vt,i?t&1|2:t&1),e):(kn(e),null);case 22:case 23:return T0(),i=e.memoizedState!==null,n!==null&&n.memoizedState!==null!==i&&(e.flags|=8192),i&&e.mode&1?Ci&1073741824&&(kn(e),e.subtreeFlags&6&&(e.flags|=8192)):kn(e),null;case 24:return null;case 25:return null}throw Error(fe(156,e.tag))}function eA(n,e){switch(r0(e),e.tag){case 1:return mi(e.type)&&Qf(),n=e.flags,n&65536?(e.flags=n&-65537|128,e):null;case 3:return fl(),Ot(pi),Ot($n),h0(),n=e.flags,n&65536&&!(n&128)?(e.flags=n&-65537|128,e):null;case 5:return d0(e),null;case 13:if(Ot(Vt),n=e.memoizedState,n!==null&&n.dehydrated!==null){if(e.alternate===null)throw Error(fe(340));ul()}return n=e.flags,n&65536?(e.flags=n&-65537|128,e):null;case 19:return Ot(Vt),null;case 4:return fl(),null;case 10:return l0(e.type._context),null;case 22:case 23:return T0(),null;case 24:return null;default:return null}}var bc=!1,Gn=!1,tA=typeof WeakSet=="function"?WeakSet:Set,Le=null;function zo(n,e){var t=n.ref;if(t!==null)if(typeof t=="function")try{t(null)}catch(i){Kt(n,e,i)}else t.current=null}function hm(n,e,t){try{t()}catch(i){Kt(n,e,i)}}var xv=!1;function nA(n,e){if(Zp=$f,n=w1(),n0(n)){if("selectionStart"in n)var t={start:n.selectionStart,end:n.selectionEnd};else e:{t=(t=n.ownerDocument)&&t.defaultView||window;var i=t.getSelection&&t.getSelection();if(i&&i.rangeCount!==0){t=i.anchorNode;var r=i.anchorOffset,s=i.focusNode;i=i.focusOffset;try{t.nodeType,s.nodeType}catch{t=null;break e}var a=0,o=-1,l=-1,u=0,c=0,d=n,f=null;t:for(;;){for(var h;d!==t||r!==0&&d.nodeType!==3||(o=a+r),d!==s||i!==0&&d.nodeType!==3||(l=a+i),d.nodeType===3&&(a+=d.nodeValue.length),(h=d.firstChild)!==null;)f=d,d=h;for(;;){if(d===n)break t;if(f===t&&++u===r&&(o=a),f===s&&++c===i&&(l=a),(h=d.nextSibling)!==null)break;d=f,f=d.parentNode}d=h}t=o===-1||l===-1?null:{start:o,end:l}}else t=null}t=t||{start:0,end:0}}else t=null;for(jp={focusedElem:n,selectionRange:t},$f=!1,Le=e;Le!==null;)if(e=Le,n=e.child,(e.subtreeFlags&1028)!==0&&n!==null)n.return=e,Le=n;else for(;Le!==null;){e=Le;try{var m=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(m!==null){var _=m.memoizedProps,g=m.memoizedState,p=e.stateNode,v=p.getSnapshotBeforeUpdate(e.elementType===e.type?_:dr(e.type,_),g);p.__reactInternalSnapshotBeforeUpdate=v}break;case 3:var S=e.stateNode.containerInfo;S.nodeType===1?S.textContent="":S.nodeType===9&&S.documentElement&&S.removeChild(S.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(fe(163))}}catch(x){Kt(e,e.return,x)}if(n=e.sibling,n!==null){n.return=e.return,Le=n;break}Le=e.return}return m=xv,xv=!1,m}function hu(n,e,t){var i=e.updateQueue;if(i=i!==null?i.lastEffect:null,i!==null){var r=i=i.next;do{if((r.tag&n)===n){var s=r.destroy;r.destroy=void 0,s!==void 0&&hm(e,t,s)}r=r.next}while(r!==i)}}function Vd(n,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var t=e=e.next;do{if((t.tag&n)===n){var i=t.create;t.destroy=i()}t=t.next}while(t!==e)}}function pm(n){var e=n.ref;if(e!==null){var t=n.stateNode;switch(n.tag){case 5:n=t;break;default:n=t}typeof e=="function"?e(n):e.current=n}}function SS(n){var e=n.alternate;e!==null&&(n.alternate=null,SS(e)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(e=n.stateNode,e!==null&&(delete e[Dr],delete e[Bu],delete e[em],delete e[kw],delete e[Bw])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function MS(n){return n.tag===5||n.tag===3||n.tag===4}function yv(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||MS(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function mm(n,e,t){var i=n.tag;if(i===5||i===6)n=n.stateNode,e?t.nodeType===8?t.parentNode.insertBefore(n,e):t.insertBefore(n,e):(t.nodeType===8?(e=t.parentNode,e.insertBefore(n,t)):(e=t,e.appendChild(n)),t=t._reactRootContainer,t!=null||e.onclick!==null||(e.onclick=jf));else if(i!==4&&(n=n.child,n!==null))for(mm(n,e,t),n=n.sibling;n!==null;)mm(n,e,t),n=n.sibling}function gm(n,e,t){var i=n.tag;if(i===5||i===6)n=n.stateNode,e?t.insertBefore(n,e):t.appendChild(n);else if(i!==4&&(n=n.child,n!==null))for(gm(n,e,t),n=n.sibling;n!==null;)gm(n,e,t),n=n.sibling}var bn=null,hr=!1;function ws(n,e,t){for(t=t.child;t!==null;)ES(n,e,t),t=t.sibling}function ES(n,e,t){if(Or&&typeof Or.onCommitFiberUnmount=="function")try{Or.onCommitFiberUnmount(Nd,t)}catch{}switch(t.tag){case 5:Gn||zo(t,e);case 6:var i=bn,r=hr;bn=null,ws(n,e,t),bn=i,hr=r,bn!==null&&(hr?(n=bn,t=t.stateNode,n.nodeType===8?n.parentNode.removeChild(t):n.removeChild(t)):bn.removeChild(t.stateNode));break;case 18:bn!==null&&(hr?(n=bn,t=t.stateNode,n.nodeType===8?vh(n.parentNode,t):n.nodeType===1&&vh(n,t),Iu(n)):vh(bn,t.stateNode));break;case 4:i=bn,r=hr,bn=t.stateNode.containerInfo,hr=!0,ws(n,e,t),bn=i,hr=r;break;case 0:case 11:case 14:case 15:if(!Gn&&(i=t.updateQueue,i!==null&&(i=i.lastEffect,i!==null))){r=i=i.next;do{var s=r,a=s.destroy;s=s.tag,a!==void 0&&(s&2||s&4)&&hm(t,e,a),r=r.next}while(r!==i)}ws(n,e,t);break;case 1:if(!Gn&&(zo(t,e),i=t.stateNode,typeof i.componentWillUnmount=="function"))try{i.props=t.memoizedProps,i.state=t.memoizedState,i.componentWillUnmount()}catch(o){Kt(t,e,o)}ws(n,e,t);break;case 21:ws(n,e,t);break;case 22:t.mode&1?(Gn=(i=Gn)||t.memoizedState!==null,ws(n,e,t),Gn=i):ws(n,e,t);break;default:ws(n,e,t)}}function Sv(n){var e=n.updateQueue;if(e!==null){n.updateQueue=null;var t=n.stateNode;t===null&&(t=n.stateNode=new tA),e.forEach(function(i){var r=fA.bind(null,n,i);t.has(i)||(t.add(i),i.then(r,r))})}}function or(n,e){var t=e.deletions;if(t!==null)for(var i=0;i<t.length;i++){var r=t[i];try{var s=n,a=e,o=a;e:for(;o!==null;){switch(o.tag){case 5:bn=o.stateNode,hr=!1;break e;case 3:bn=o.stateNode.containerInfo,hr=!0;break e;case 4:bn=o.stateNode.containerInfo,hr=!0;break e}o=o.return}if(bn===null)throw Error(fe(160));ES(s,a,r),bn=null,hr=!1;var l=r.alternate;l!==null&&(l.return=null),r.return=null}catch(u){Kt(r,e,u)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)TS(e,n),e=e.sibling}function TS(n,e){var t=n.alternate,i=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(or(e,n),Tr(n),i&4){try{hu(3,n,n.return),Vd(3,n)}catch(_){Kt(n,n.return,_)}try{hu(5,n,n.return)}catch(_){Kt(n,n.return,_)}}break;case 1:or(e,n),Tr(n),i&512&&t!==null&&zo(t,t.return);break;case 5:if(or(e,n),Tr(n),i&512&&t!==null&&zo(t,t.return),n.flags&32){var r=n.stateNode;try{Pu(r,"")}catch(_){Kt(n,n.return,_)}}if(i&4&&(r=n.stateNode,r!=null)){var s=n.memoizedProps,a=t!==null?t.memoizedProps:s,o=n.type,l=n.updateQueue;if(n.updateQueue=null,l!==null)try{o==="input"&&s.type==="radio"&&s.name!=null&&Yy(r,s),zp(o,a);var u=zp(o,s);for(a=0;a<l.length;a+=2){var c=l[a],d=l[a+1];c==="style"?jy(r,d):c==="dangerouslySetInnerHTML"?Ky(r,d):c==="children"?Pu(r,d):Gg(r,c,d,u)}switch(o){case"input":Up(r,s);break;case"textarea":qy(r,s);break;case"select":var f=r._wrapperState.wasMultiple;r._wrapperState.wasMultiple=!!s.multiple;var h=s.value;h!=null?Xo(r,!!s.multiple,h,!1):f!==!!s.multiple&&(s.defaultValue!=null?Xo(r,!!s.multiple,s.defaultValue,!0):Xo(r,!!s.multiple,s.multiple?[]:"",!1))}r[Bu]=s}catch(_){Kt(n,n.return,_)}}break;case 6:if(or(e,n),Tr(n),i&4){if(n.stateNode===null)throw Error(fe(162));r=n.stateNode,s=n.memoizedProps;try{r.nodeValue=s}catch(_){Kt(n,n.return,_)}}break;case 3:if(or(e,n),Tr(n),i&4&&t!==null&&t.memoizedState.isDehydrated)try{Iu(e.containerInfo)}catch(_){Kt(n,n.return,_)}break;case 4:or(e,n),Tr(n);break;case 13:or(e,n),Tr(n),r=n.child,r.flags&8192&&(s=r.memoizedState!==null,r.stateNode.isHidden=s,!s||r.alternate!==null&&r.alternate.memoizedState!==null||(M0=nn())),i&4&&Sv(n);break;case 22:if(c=t!==null&&t.memoizedState!==null,n.mode&1?(Gn=(u=Gn)||c,or(e,n),Gn=u):or(e,n),Tr(n),i&8192){if(u=n.memoizedState!==null,(n.stateNode.isHidden=u)&&!c&&n.mode&1)for(Le=n,c=n.child;c!==null;){for(d=Le=c;Le!==null;){switch(f=Le,h=f.child,f.tag){case 0:case 11:case 14:case 15:hu(4,f,f.return);break;case 1:zo(f,f.return);var m=f.stateNode;if(typeof m.componentWillUnmount=="function"){i=f,t=f.return;try{e=i,m.props=e.memoizedProps,m.state=e.memoizedState,m.componentWillUnmount()}catch(_){Kt(i,t,_)}}break;case 5:zo(f,f.return);break;case 22:if(f.memoizedState!==null){Ev(d);continue}}h!==null?(h.return=f,Le=h):Ev(d)}c=c.sibling}e:for(c=null,d=n;;){if(d.tag===5){if(c===null){c=d;try{r=d.stateNode,u?(s=r.style,typeof s.setProperty=="function"?s.setProperty("display","none","important"):s.display="none"):(o=d.stateNode,l=d.memoizedProps.style,a=l!=null&&l.hasOwnProperty("display")?l.display:null,o.style.display=Zy("display",a))}catch(_){Kt(n,n.return,_)}}}else if(d.tag===6){if(c===null)try{d.stateNode.nodeValue=u?"":d.memoizedProps}catch(_){Kt(n,n.return,_)}}else if((d.tag!==22&&d.tag!==23||d.memoizedState===null||d===n)&&d.child!==null){d.child.return=d,d=d.child;continue}if(d===n)break e;for(;d.sibling===null;){if(d.return===null||d.return===n)break e;c===d&&(c=null),d=d.return}c===d&&(c=null),d.sibling.return=d.return,d=d.sibling}}break;case 19:or(e,n),Tr(n),i&4&&Sv(n);break;case 21:break;default:or(e,n),Tr(n)}}function Tr(n){var e=n.flags;if(e&2){try{e:{for(var t=n.return;t!==null;){if(MS(t)){var i=t;break e}t=t.return}throw Error(fe(160))}switch(i.tag){case 5:var r=i.stateNode;i.flags&32&&(Pu(r,""),i.flags&=-33);var s=yv(n);gm(n,s,r);break;case 3:case 4:var a=i.stateNode.containerInfo,o=yv(n);mm(n,o,a);break;default:throw Error(fe(161))}}catch(l){Kt(n,n.return,l)}n.flags&=-3}e&4096&&(n.flags&=-4097)}function iA(n,e,t){Le=n,wS(n)}function wS(n,e,t){for(var i=(n.mode&1)!==0;Le!==null;){var r=Le,s=r.child;if(r.tag===22&&i){var a=r.memoizedState!==null||bc;if(!a){var o=r.alternate,l=o!==null&&o.memoizedState!==null||Gn;o=bc;var u=Gn;if(bc=a,(Gn=l)&&!u)for(Le=r;Le!==null;)a=Le,l=a.child,a.tag===22&&a.memoizedState!==null?Tv(r):l!==null?(l.return=a,Le=l):Tv(r);for(;s!==null;)Le=s,wS(s),s=s.sibling;Le=r,bc=o,Gn=u}Mv(n)}else r.subtreeFlags&8772&&s!==null?(s.return=r,Le=s):Mv(n)}}function Mv(n){for(;Le!==null;){var e=Le;if(e.flags&8772){var t=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:Gn||Vd(5,e);break;case 1:var i=e.stateNode;if(e.flags&4&&!Gn)if(t===null)i.componentDidMount();else{var r=e.elementType===e.type?t.memoizedProps:dr(e.type,t.memoizedProps);i.componentDidUpdate(r,t.memoizedState,i.__reactInternalSnapshotBeforeUpdate)}var s=e.updateQueue;s!==null&&av(e,s,i);break;case 3:var a=e.updateQueue;if(a!==null){if(t=null,e.child!==null)switch(e.child.tag){case 5:t=e.child.stateNode;break;case 1:t=e.child.stateNode}av(e,a,t)}break;case 5:var o=e.stateNode;if(t===null&&e.flags&4){t=o;var l=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":l.autoFocus&&t.focus();break;case"img":l.src&&(t.src=l.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var u=e.alternate;if(u!==null){var c=u.memoizedState;if(c!==null){var d=c.dehydrated;d!==null&&Iu(d)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(fe(163))}Gn||e.flags&512&&pm(e)}catch(f){Kt(e,e.return,f)}}if(e===n){Le=null;break}if(t=e.sibling,t!==null){t.return=e.return,Le=t;break}Le=e.return}}function Ev(n){for(;Le!==null;){var e=Le;if(e===n){Le=null;break}var t=e.sibling;if(t!==null){t.return=e.return,Le=t;break}Le=e.return}}function Tv(n){for(;Le!==null;){var e=Le;try{switch(e.tag){case 0:case 11:case 15:var t=e.return;try{Vd(4,e)}catch(l){Kt(e,t,l)}break;case 1:var i=e.stateNode;if(typeof i.componentDidMount=="function"){var r=e.return;try{i.componentDidMount()}catch(l){Kt(e,r,l)}}var s=e.return;try{pm(e)}catch(l){Kt(e,s,l)}break;case 5:var a=e.return;try{pm(e)}catch(l){Kt(e,a,l)}}}catch(l){Kt(e,e.return,l)}if(e===n){Le=null;break}var o=e.sibling;if(o!==null){o.return=e.return,Le=o;break}Le=e.return}}var rA=Math.ceil,ld=ys.ReactCurrentDispatcher,y0=ys.ReactCurrentOwner,ir=ys.ReactCurrentBatchConfig,_t=0,Cn=null,dn=null,Ln=0,Ci=0,Vo=fa(0),vn=0,Xu=null,qa=0,Hd=0,S0=0,pu=null,fi=null,M0=0,hl=1/0,jr=null,ud=!1,_m=null,js=null,Pc=!1,Bs=null,cd=0,mu=0,vm=null,wf=-1,Af=0;function si(){return _t&6?nn():wf!==-1?wf:wf=nn()}function Qs(n){return n.mode&1?_t&2&&Ln!==0?Ln&-Ln:Vw.transition!==null?(Af===0&&(Af=u1()),Af):(n=Et,n!==0||(n=window.event,n=n===void 0?16:g1(n.type)),n):1}function xr(n,e,t,i){if(50<mu)throw mu=0,vm=null,Error(fe(185));ac(n,t,i),(!(_t&2)||n!==Cn)&&(n===Cn&&(!(_t&2)&&(Hd|=t),vn===4&&Fs(n,Ln)),gi(n,i),t===1&&_t===0&&!(e.mode&1)&&(hl=nn()+500,kd&&da()))}function gi(n,e){var t=n.callbackNode;VT(n,e);var i=qf(n,n===Cn?Ln:0);if(i===0)t!==null&&N_(t),n.callbackNode=null,n.callbackPriority=0;else if(e=i&-i,n.callbackPriority!==e){if(t!=null&&N_(t),e===1)n.tag===0?zw(wv.bind(null,n)):U1(wv.bind(null,n)),Fw(function(){!(_t&6)&&da()}),t=null;else{switch(c1(i)){case 1:t=$g;break;case 4:t=o1;break;case 16:t=Yf;break;case 536870912:t=l1;break;default:t=Yf}t=NS(t,AS.bind(null,n))}n.callbackPriority=e,n.callbackNode=t}}function AS(n,e){if(wf=-1,Af=0,_t&6)throw Error(fe(327));var t=n.callbackNode;if(Zo()&&n.callbackNode!==t)return null;var i=qf(n,n===Cn?Ln:0);if(i===0)return null;if(i&30||i&n.expiredLanes||e)e=fd(n,i);else{e=i;var r=_t;_t|=2;var s=RS();(Cn!==n||Ln!==e)&&(jr=null,hl=nn()+500,Ua(n,e));do try{oA();break}catch(o){CS(n,o)}while(!0);o0(),ld.current=s,_t=r,dn!==null?e=0:(Cn=null,Ln=0,e=vn)}if(e!==0){if(e===2&&(r=Xp(n),r!==0&&(i=r,e=xm(n,r))),e===1)throw t=Xu,Ua(n,0),Fs(n,i),gi(n,nn()),t;if(e===6)Fs(n,i);else{if(r=n.current.alternate,!(i&30)&&!sA(r)&&(e=fd(n,i),e===2&&(s=Xp(n),s!==0&&(i=s,e=xm(n,s))),e===1))throw t=Xu,Ua(n,0),Fs(n,i),gi(n,nn()),t;switch(n.finishedWork=r,n.finishedLanes=i,e){case 0:case 1:throw Error(fe(345));case 2:Sa(n,fi,jr);break;case 3:if(Fs(n,i),(i&130023424)===i&&(e=M0+500-nn(),10<e)){if(qf(n,0)!==0)break;if(r=n.suspendedLanes,(r&i)!==i){si(),n.pingedLanes|=n.suspendedLanes&r;break}n.timeoutHandle=Jp(Sa.bind(null,n,fi,jr),e);break}Sa(n,fi,jr);break;case 4:if(Fs(n,i),(i&4194240)===i)break;for(e=n.eventTimes,r=-1;0<i;){var a=31-vr(i);s=1<<a,a=e[a],a>r&&(r=a),i&=~s}if(i=r,i=nn()-i,i=(120>i?120:480>i?480:1080>i?1080:1920>i?1920:3e3>i?3e3:4320>i?4320:1960*rA(i/1960))-i,10<i){n.timeoutHandle=Jp(Sa.bind(null,n,fi,jr),i);break}Sa(n,fi,jr);break;case 5:Sa(n,fi,jr);break;default:throw Error(fe(329))}}}return gi(n,nn()),n.callbackNode===t?AS.bind(null,n):null}function xm(n,e){var t=pu;return n.current.memoizedState.isDehydrated&&(Ua(n,e).flags|=256),n=fd(n,e),n!==2&&(e=fi,fi=t,e!==null&&ym(e)),n}function ym(n){fi===null?fi=n:fi.push.apply(fi,n)}function sA(n){for(var e=n;;){if(e.flags&16384){var t=e.updateQueue;if(t!==null&&(t=t.stores,t!==null))for(var i=0;i<t.length;i++){var r=t[i],s=r.getSnapshot;r=r.value;try{if(!yr(s(),r))return!1}catch{return!1}}}if(t=e.child,e.subtreeFlags&16384&&t!==null)t.return=e,e=t;else{if(e===n)break;for(;e.sibling===null;){if(e.return===null||e.return===n)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function Fs(n,e){for(e&=~S0,e&=~Hd,n.suspendedLanes|=e,n.pingedLanes&=~e,n=n.expirationTimes;0<e;){var t=31-vr(e),i=1<<t;n[t]=-1,e&=~i}}function wv(n){if(_t&6)throw Error(fe(327));Zo();var e=qf(n,0);if(!(e&1))return gi(n,nn()),null;var t=fd(n,e);if(n.tag!==0&&t===2){var i=Xp(n);i!==0&&(e=i,t=xm(n,i))}if(t===1)throw t=Xu,Ua(n,0),Fs(n,e),gi(n,nn()),t;if(t===6)throw Error(fe(345));return n.finishedWork=n.current.alternate,n.finishedLanes=e,Sa(n,fi,jr),gi(n,nn()),null}function E0(n,e){var t=_t;_t|=1;try{return n(e)}finally{_t=t,_t===0&&(hl=nn()+500,kd&&da())}}function $a(n){Bs!==null&&Bs.tag===0&&!(_t&6)&&Zo();var e=_t;_t|=1;var t=ir.transition,i=Et;try{if(ir.transition=null,Et=1,n)return n()}finally{Et=i,ir.transition=t,_t=e,!(_t&6)&&da()}}function T0(){Ci=Vo.current,Ot(Vo)}function Ua(n,e){n.finishedWork=null,n.finishedLanes=0;var t=n.timeoutHandle;if(t!==-1&&(n.timeoutHandle=-1,Uw(t)),dn!==null)for(t=dn.return;t!==null;){var i=t;switch(r0(i),i.tag){case 1:i=i.type.childContextTypes,i!=null&&Qf();break;case 3:fl(),Ot(pi),Ot($n),h0();break;case 5:d0(i);break;case 4:fl();break;case 13:Ot(Vt);break;case 19:Ot(Vt);break;case 10:l0(i.type._context);break;case 22:case 23:T0()}t=t.return}if(Cn=n,dn=n=Js(n.current,null),Ln=Ci=e,vn=0,Xu=null,S0=Hd=qa=0,fi=pu=null,ba!==null){for(e=0;e<ba.length;e++)if(t=ba[e],i=t.interleaved,i!==null){t.interleaved=null;var r=i.next,s=t.pending;if(s!==null){var a=s.next;s.next=r,i.next=a}t.pending=i}ba=null}return n}function CS(n,e){do{var t=dn;try{if(o0(),Mf.current=od,ad){for(var i=Wt.memoizedState;i!==null;){var r=i.queue;r!==null&&(r.pending=null),i=i.next}ad=!1}if(Ya=0,An=gn=Wt=null,du=!1,Hu=0,y0.current=null,t===null||t.return===null){vn=1,Xu=e,dn=null;break}e:{var s=n,a=t.return,o=t,l=e;if(e=Ln,o.flags|=32768,l!==null&&typeof l=="object"&&typeof l.then=="function"){var u=l,c=o,d=c.tag;if(!(c.mode&1)&&(d===0||d===11||d===15)){var f=c.alternate;f?(c.updateQueue=f.updateQueue,c.memoizedState=f.memoizedState,c.lanes=f.lanes):(c.updateQueue=null,c.memoizedState=null)}var h=dv(a);if(h!==null){h.flags&=-257,hv(h,a,o,s,e),h.mode&1&&fv(s,u,e),e=h,l=u;var m=e.updateQueue;if(m===null){var _=new Set;_.add(l),e.updateQueue=_}else m.add(l);break e}else{if(!(e&1)){fv(s,u,e),w0();break e}l=Error(fe(426))}}else if(kt&&o.mode&1){var g=dv(a);if(g!==null){!(g.flags&65536)&&(g.flags|=256),hv(g,a,o,s,e),s0(dl(l,o));break e}}s=l=dl(l,o),vn!==4&&(vn=2),pu===null?pu=[s]:pu.push(s),s=a;do{switch(s.tag){case 3:s.flags|=65536,e&=-e,s.lanes|=e;var p=cS(s,l,e);sv(s,p);break e;case 1:o=l;var v=s.type,S=s.stateNode;if(!(s.flags&128)&&(typeof v.getDerivedStateFromError=="function"||S!==null&&typeof S.componentDidCatch=="function"&&(js===null||!js.has(S)))){s.flags|=65536,e&=-e,s.lanes|=e;var x=fS(s,o,e);sv(s,x);break e}}s=s.return}while(s!==null)}PS(t)}catch(E){e=E,dn===t&&t!==null&&(dn=t=t.return);continue}break}while(!0)}function RS(){var n=ld.current;return ld.current=od,n===null?od:n}function w0(){(vn===0||vn===3||vn===2)&&(vn=4),Cn===null||!(qa&268435455)&&!(Hd&268435455)||Fs(Cn,Ln)}function fd(n,e){var t=_t;_t|=2;var i=RS();(Cn!==n||Ln!==e)&&(jr=null,Ua(n,e));do try{aA();break}catch(r){CS(n,r)}while(!0);if(o0(),_t=t,ld.current=i,dn!==null)throw Error(fe(261));return Cn=null,Ln=0,vn}function aA(){for(;dn!==null;)bS(dn)}function oA(){for(;dn!==null&&!LT();)bS(dn)}function bS(n){var e=LS(n.alternate,n,Ci);n.memoizedProps=n.pendingProps,e===null?PS(n):dn=e,y0.current=null}function PS(n){var e=n;do{var t=e.alternate;if(n=e.return,e.flags&32768){if(t=eA(t,e),t!==null){t.flags&=32767,dn=t;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{vn=6,dn=null;return}}else if(t=Jw(t,e,Ci),t!==null){dn=t;return}if(e=e.sibling,e!==null){dn=e;return}dn=e=n}while(e!==null);vn===0&&(vn=5)}function Sa(n,e,t){var i=Et,r=ir.transition;try{ir.transition=null,Et=1,lA(n,e,t,i)}finally{ir.transition=r,Et=i}return null}function lA(n,e,t,i){do Zo();while(Bs!==null);if(_t&6)throw Error(fe(327));t=n.finishedWork;var r=n.finishedLanes;if(t===null)return null;if(n.finishedWork=null,n.finishedLanes=0,t===n.current)throw Error(fe(177));n.callbackNode=null,n.callbackPriority=0;var s=t.lanes|t.childLanes;if(HT(n,s),n===Cn&&(dn=Cn=null,Ln=0),!(t.subtreeFlags&2064)&&!(t.flags&2064)||Pc||(Pc=!0,NS(Yf,function(){return Zo(),null})),s=(t.flags&15990)!==0,t.subtreeFlags&15990||s){s=ir.transition,ir.transition=null;var a=Et;Et=1;var o=_t;_t|=4,y0.current=null,nA(n,t),TS(t,n),Rw(jp),$f=!!Zp,jp=Zp=null,n.current=t,iA(t),NT(),_t=o,Et=a,ir.transition=s}else n.current=t;if(Pc&&(Pc=!1,Bs=n,cd=r),s=n.pendingLanes,s===0&&(js=null),FT(t.stateNode),gi(n,nn()),e!==null)for(i=n.onRecoverableError,t=0;t<e.length;t++)r=e[t],i(r.value,{componentStack:r.stack,digest:r.digest});if(ud)throw ud=!1,n=_m,_m=null,n;return cd&1&&n.tag!==0&&Zo(),s=n.pendingLanes,s&1?n===vm?mu++:(mu=0,vm=n):mu=0,da(),null}function Zo(){if(Bs!==null){var n=c1(cd),e=ir.transition,t=Et;try{if(ir.transition=null,Et=16>n?16:n,Bs===null)var i=!1;else{if(n=Bs,Bs=null,cd=0,_t&6)throw Error(fe(331));var r=_t;for(_t|=4,Le=n.current;Le!==null;){var s=Le,a=s.child;if(Le.flags&16){var o=s.deletions;if(o!==null){for(var l=0;l<o.length;l++){var u=o[l];for(Le=u;Le!==null;){var c=Le;switch(c.tag){case 0:case 11:case 15:hu(8,c,s)}var d=c.child;if(d!==null)d.return=c,Le=d;else for(;Le!==null;){c=Le;var f=c.sibling,h=c.return;if(SS(c),c===u){Le=null;break}if(f!==null){f.return=h,Le=f;break}Le=h}}}var m=s.alternate;if(m!==null){var _=m.child;if(_!==null){m.child=null;do{var g=_.sibling;_.sibling=null,_=g}while(_!==null)}}Le=s}}if(s.subtreeFlags&2064&&a!==null)a.return=s,Le=a;else e:for(;Le!==null;){if(s=Le,s.flags&2048)switch(s.tag){case 0:case 11:case 15:hu(9,s,s.return)}var p=s.sibling;if(p!==null){p.return=s.return,Le=p;break e}Le=s.return}}var v=n.current;for(Le=v;Le!==null;){a=Le;var S=a.child;if(a.subtreeFlags&2064&&S!==null)S.return=a,Le=S;else e:for(a=v;Le!==null;){if(o=Le,o.flags&2048)try{switch(o.tag){case 0:case 11:case 15:Vd(9,o)}}catch(E){Kt(o,o.return,E)}if(o===a){Le=null;break e}var x=o.sibling;if(x!==null){x.return=o.return,Le=x;break e}Le=o.return}}if(_t=r,da(),Or&&typeof Or.onPostCommitFiberRoot=="function")try{Or.onPostCommitFiberRoot(Nd,n)}catch{}i=!0}return i}finally{Et=t,ir.transition=e}}return!1}function Av(n,e,t){e=dl(t,e),e=cS(n,e,1),n=Zs(n,e,1),e=si(),n!==null&&(ac(n,1,e),gi(n,e))}function Kt(n,e,t){if(n.tag===3)Av(n,n,t);else for(;e!==null;){if(e.tag===3){Av(e,n,t);break}else if(e.tag===1){var i=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof i.componentDidCatch=="function"&&(js===null||!js.has(i))){n=dl(t,n),n=fS(e,n,1),e=Zs(e,n,1),n=si(),e!==null&&(ac(e,1,n),gi(e,n));break}}e=e.return}}function uA(n,e,t){var i=n.pingCache;i!==null&&i.delete(e),e=si(),n.pingedLanes|=n.suspendedLanes&t,Cn===n&&(Ln&t)===t&&(vn===4||vn===3&&(Ln&130023424)===Ln&&500>nn()-M0?Ua(n,0):S0|=t),gi(n,e)}function DS(n,e){e===0&&(n.mode&1?(e=yc,yc<<=1,!(yc&130023424)&&(yc=4194304)):e=1);var t=si();n=ps(n,e),n!==null&&(ac(n,e,t),gi(n,t))}function cA(n){var e=n.memoizedState,t=0;e!==null&&(t=e.retryLane),DS(n,t)}function fA(n,e){var t=0;switch(n.tag){case 13:var i=n.stateNode,r=n.memoizedState;r!==null&&(t=r.retryLane);break;case 19:i=n.stateNode;break;default:throw Error(fe(314))}i!==null&&i.delete(e),DS(n,t)}var LS;LS=function(n,e,t){if(n!==null)if(n.memoizedProps!==e.pendingProps||pi.current)hi=!0;else{if(!(n.lanes&t)&&!(e.flags&128))return hi=!1,Qw(n,e,t);hi=!!(n.flags&131072)}else hi=!1,kt&&e.flags&1048576&&F1(e,td,e.index);switch(e.lanes=0,e.tag){case 2:var i=e.type;Tf(n,e),n=e.pendingProps;var r=ll(e,$n.current);Ko(e,t),r=m0(null,e,i,n,r,t);var s=g0();return e.flags|=1,typeof r=="object"&&r!==null&&typeof r.render=="function"&&r.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,mi(i)?(s=!0,Jf(e)):s=!1,e.memoizedState=r.state!==null&&r.state!==void 0?r.state:null,c0(e),r.updater=zd,e.stateNode=r,r._reactInternals=e,am(e,i,n,t),e=um(null,e,i,!0,s,t)):(e.tag=0,kt&&s&&i0(e),ti(null,e,r,t),e=e.child),e;case 16:i=e.elementType;e:{switch(Tf(n,e),n=e.pendingProps,r=i._init,i=r(i._payload),e.type=i,r=e.tag=hA(i),n=dr(i,n),r){case 0:e=lm(null,e,i,n,t);break e;case 1:e=gv(null,e,i,n,t);break e;case 11:e=pv(null,e,i,n,t);break e;case 14:e=mv(null,e,i,dr(i.type,n),t);break e}throw Error(fe(306,i,""))}return e;case 0:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:dr(i,r),lm(n,e,i,r,t);case 1:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:dr(i,r),gv(n,e,i,r,t);case 3:e:{if(mS(e),n===null)throw Error(fe(387));i=e.pendingProps,s=e.memoizedState,r=s.element,H1(n,e),rd(e,i,null,t);var a=e.memoizedState;if(i=a.element,s.isDehydrated)if(s={element:i,isDehydrated:!1,cache:a.cache,pendingSuspenseBoundaries:a.pendingSuspenseBoundaries,transitions:a.transitions},e.updateQueue.baseState=s,e.memoizedState=s,e.flags&256){r=dl(Error(fe(423)),e),e=_v(n,e,i,t,r);break e}else if(i!==r){r=dl(Error(fe(424)),e),e=_v(n,e,i,t,r);break e}else for(Ii=Ks(e.stateNode.containerInfo.firstChild),Oi=e,kt=!0,pr=null,t=z1(e,null,i,t),e.child=t;t;)t.flags=t.flags&-3|4096,t=t.sibling;else{if(ul(),i===r){e=ms(n,e,t);break e}ti(n,e,i,t)}e=e.child}return e;case 5:return G1(e),n===null&&im(e),i=e.type,r=e.pendingProps,s=n!==null?n.memoizedProps:null,a=r.children,Qp(i,r)?a=null:s!==null&&Qp(i,s)&&(e.flags|=32),pS(n,e),ti(n,e,a,t),e.child;case 6:return n===null&&im(e),null;case 13:return gS(n,e,t);case 4:return f0(e,e.stateNode.containerInfo),i=e.pendingProps,n===null?e.child=cl(e,null,i,t):ti(n,e,i,t),e.child;case 11:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:dr(i,r),pv(n,e,i,r,t);case 7:return ti(n,e,e.pendingProps,t),e.child;case 8:return ti(n,e,e.pendingProps.children,t),e.child;case 12:return ti(n,e,e.pendingProps.children,t),e.child;case 10:e:{if(i=e.type._context,r=e.pendingProps,s=e.memoizedProps,a=r.value,Nt(nd,i._currentValue),i._currentValue=a,s!==null)if(yr(s.value,a)){if(s.children===r.children&&!pi.current){e=ms(n,e,t);break e}}else for(s=e.child,s!==null&&(s.return=e);s!==null;){var o=s.dependencies;if(o!==null){a=s.child;for(var l=o.firstContext;l!==null;){if(l.context===i){if(s.tag===1){l=os(-1,t&-t),l.tag=2;var u=s.updateQueue;if(u!==null){u=u.shared;var c=u.pending;c===null?l.next=l:(l.next=c.next,c.next=l),u.pending=l}}s.lanes|=t,l=s.alternate,l!==null&&(l.lanes|=t),rm(s.return,t,e),o.lanes|=t;break}l=l.next}}else if(s.tag===10)a=s.type===e.type?null:s.child;else if(s.tag===18){if(a=s.return,a===null)throw Error(fe(341));a.lanes|=t,o=a.alternate,o!==null&&(o.lanes|=t),rm(a,t,e),a=s.sibling}else a=s.child;if(a!==null)a.return=s;else for(a=s;a!==null;){if(a===e){a=null;break}if(s=a.sibling,s!==null){s.return=a.return,a=s;break}a=a.return}s=a}ti(n,e,r.children,t),e=e.child}return e;case 9:return r=e.type,i=e.pendingProps.children,Ko(e,t),r=sr(r),i=i(r),e.flags|=1,ti(n,e,i,t),e.child;case 14:return i=e.type,r=dr(i,e.pendingProps),r=dr(i.type,r),mv(n,e,i,r,t);case 15:return dS(n,e,e.type,e.pendingProps,t);case 17:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:dr(i,r),Tf(n,e),e.tag=1,mi(i)?(n=!0,Jf(e)):n=!1,Ko(e,t),uS(e,i,r),am(e,i,r,t),um(null,e,i,!0,n,t);case 19:return _S(n,e,t);case 22:return hS(n,e,t)}throw Error(fe(156,e.tag))};function NS(n,e){return a1(n,e)}function dA(n,e,t,i){this.tag=n,this.key=t,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=i,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function er(n,e,t,i){return new dA(n,e,t,i)}function A0(n){return n=n.prototype,!(!n||!n.isReactComponent)}function hA(n){if(typeof n=="function")return A0(n)?1:0;if(n!=null){if(n=n.$$typeof,n===Xg)return 11;if(n===Yg)return 14}return 2}function Js(n,e){var t=n.alternate;return t===null?(t=er(n.tag,e,n.key,n.mode),t.elementType=n.elementType,t.type=n.type,t.stateNode=n.stateNode,t.alternate=n,n.alternate=t):(t.pendingProps=e,t.type=n.type,t.flags=0,t.subtreeFlags=0,t.deletions=null),t.flags=n.flags&14680064,t.childLanes=n.childLanes,t.lanes=n.lanes,t.child=n.child,t.memoizedProps=n.memoizedProps,t.memoizedState=n.memoizedState,t.updateQueue=n.updateQueue,e=n.dependencies,t.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},t.sibling=n.sibling,t.index=n.index,t.ref=n.ref,t}function Cf(n,e,t,i,r,s){var a=2;if(i=n,typeof n=="function")A0(n)&&(a=1);else if(typeof n=="string")a=5;else e:switch(n){case Do:return Fa(t.children,r,s,e);case Wg:a=8,r|=8;break;case Pp:return n=er(12,t,e,r|2),n.elementType=Pp,n.lanes=s,n;case Dp:return n=er(13,t,e,r),n.elementType=Dp,n.lanes=s,n;case Lp:return n=er(19,t,e,r),n.elementType=Lp,n.lanes=s,n;case Gy:return Gd(t,r,s,e);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case Vy:a=10;break e;case Hy:a=9;break e;case Xg:a=11;break e;case Yg:a=14;break e;case Ns:a=16,i=null;break e}throw Error(fe(130,n==null?n:typeof n,""))}return e=er(a,t,e,r),e.elementType=n,e.type=i,e.lanes=s,e}function Fa(n,e,t,i){return n=er(7,n,i,e),n.lanes=t,n}function Gd(n,e,t,i){return n=er(22,n,i,e),n.elementType=Gy,n.lanes=t,n.stateNode={isHidden:!1},n}function Ah(n,e,t){return n=er(6,n,null,e),n.lanes=t,n}function Ch(n,e,t){return e=er(4,n.children!==null?n.children:[],n.key,e),e.lanes=t,e.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},e}function pA(n,e,t,i,r){this.tag=e,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=oh(0),this.expirationTimes=oh(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=oh(0),this.identifierPrefix=i,this.onRecoverableError=r,this.mutableSourceEagerHydrationData=null}function C0(n,e,t,i,r,s,a,o,l){return n=new pA(n,e,t,o,l),e===1?(e=1,s===!0&&(e|=8)):e=0,s=er(3,null,null,e),n.current=s,s.stateNode=n,s.memoizedState={element:i,isDehydrated:t,cache:null,transitions:null,pendingSuspenseBoundaries:null},c0(s),n}function mA(n,e,t){var i=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Po,key:i==null?null:""+i,children:n,containerInfo:e,implementation:t}}function IS(n){if(!n)return ra;n=n._reactInternals;e:{if(to(n)!==n||n.tag!==1)throw Error(fe(170));var e=n;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(mi(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(fe(171))}if(n.tag===1){var t=n.type;if(mi(t))return I1(n,t,e)}return e}function US(n,e,t,i,r,s,a,o,l){return n=C0(t,i,!0,n,r,s,a,o,l),n.context=IS(null),t=n.current,i=si(),r=Qs(t),s=os(i,r),s.callback=e??null,Zs(t,s,r),n.current.lanes=r,ac(n,r,i),gi(n,i),n}function Wd(n,e,t,i){var r=e.current,s=si(),a=Qs(r);return t=IS(t),e.context===null?e.context=t:e.pendingContext=t,e=os(s,a),e.payload={element:n},i=i===void 0?null:i,i!==null&&(e.callback=i),n=Zs(r,e,a),n!==null&&(xr(n,r,a,s),Sf(n,r,a)),a}function dd(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function Cv(n,e){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var t=n.retryLane;n.retryLane=t!==0&&t<e?t:e}}function R0(n,e){Cv(n,e),(n=n.alternate)&&Cv(n,e)}function gA(){return null}var FS=typeof reportError=="function"?reportError:function(n){console.error(n)};function b0(n){this._internalRoot=n}Xd.prototype.render=b0.prototype.render=function(n){var e=this._internalRoot;if(e===null)throw Error(fe(409));Wd(n,e,null,null)};Xd.prototype.unmount=b0.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var e=n.containerInfo;$a(function(){Wd(null,n,null,null)}),e[hs]=null}};function Xd(n){this._internalRoot=n}Xd.prototype.unstable_scheduleHydration=function(n){if(n){var e=h1();n={blockedOn:null,target:n,priority:e};for(var t=0;t<Us.length&&e!==0&&e<Us[t].priority;t++);Us.splice(t,0,n),t===0&&m1(n)}};function P0(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function Yd(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function Rv(){}function _A(n,e,t,i,r){if(r){if(typeof i=="function"){var s=i;i=function(){var u=dd(a);s.call(u)}}var a=US(e,i,n,0,null,!1,!1,"",Rv);return n._reactRootContainer=a,n[hs]=a.current,Ou(n.nodeType===8?n.parentNode:n),$a(),a}for(;r=n.lastChild;)n.removeChild(r);if(typeof i=="function"){var o=i;i=function(){var u=dd(l);o.call(u)}}var l=C0(n,0,!1,null,null,!1,!1,"",Rv);return n._reactRootContainer=l,n[hs]=l.current,Ou(n.nodeType===8?n.parentNode:n),$a(function(){Wd(e,l,t,i)}),l}function qd(n,e,t,i,r){var s=t._reactRootContainer;if(s){var a=s;if(typeof r=="function"){var o=r;r=function(){var l=dd(a);o.call(l)}}Wd(e,a,n,r)}else a=_A(t,e,n,r,i);return dd(a)}f1=function(n){switch(n.tag){case 3:var e=n.stateNode;if(e.current.memoizedState.isDehydrated){var t=Zl(e.pendingLanes);t!==0&&(Kg(e,t|1),gi(e,nn()),!(_t&6)&&(hl=nn()+500,da()))}break;case 13:$a(function(){var i=ps(n,1);if(i!==null){var r=si();xr(i,n,1,r)}}),R0(n,1)}};Zg=function(n){if(n.tag===13){var e=ps(n,134217728);if(e!==null){var t=si();xr(e,n,134217728,t)}R0(n,134217728)}};d1=function(n){if(n.tag===13){var e=Qs(n),t=ps(n,e);if(t!==null){var i=si();xr(t,n,e,i)}R0(n,e)}};h1=function(){return Et};p1=function(n,e){var t=Et;try{return Et=n,e()}finally{Et=t}};Hp=function(n,e,t){switch(e){case"input":if(Up(n,t),e=t.name,t.type==="radio"&&e!=null){for(t=n;t.parentNode;)t=t.parentNode;for(t=t.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<t.length;e++){var i=t[e];if(i!==n&&i.form===n.form){var r=Od(i);if(!r)throw Error(fe(90));Xy(i),Up(i,r)}}}break;case"textarea":qy(n,t);break;case"select":e=t.value,e!=null&&Xo(n,!!t.multiple,e,!1)}};e1=E0;t1=$a;var vA={usingClientEntryPoint:!1,Events:[lc,Uo,Od,Qy,Jy,E0]},Fl={findFiberByHostInstance:Ra,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},xA={bundleType:Fl.bundleType,version:Fl.version,rendererPackageName:Fl.rendererPackageName,rendererConfig:Fl.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:ys.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=r1(n),n===null?null:n.stateNode},findFiberByHostInstance:Fl.findFiberByHostInstance||gA,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var Dc=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Dc.isDisabled&&Dc.supportsFiber)try{Nd=Dc.inject(xA),Or=Dc}catch{}}Gi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=vA;Gi.createPortal=function(n,e){var t=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!P0(e))throw Error(fe(200));return mA(n,e,null,t)};Gi.createRoot=function(n,e){if(!P0(n))throw Error(fe(299));var t=!1,i="",r=FS;return e!=null&&(e.unstable_strictMode===!0&&(t=!0),e.identifierPrefix!==void 0&&(i=e.identifierPrefix),e.onRecoverableError!==void 0&&(r=e.onRecoverableError)),e=C0(n,1,!1,null,null,t,!1,i,r),n[hs]=e.current,Ou(n.nodeType===8?n.parentNode:n),new b0(e)};Gi.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var e=n._reactInternals;if(e===void 0)throw typeof n.render=="function"?Error(fe(188)):(n=Object.keys(n).join(","),Error(fe(268,n)));return n=r1(e),n=n===null?null:n.stateNode,n};Gi.flushSync=function(n){return $a(n)};Gi.hydrate=function(n,e,t){if(!Yd(e))throw Error(fe(200));return qd(null,n,e,!0,t)};Gi.hydrateRoot=function(n,e,t){if(!P0(n))throw Error(fe(405));var i=t!=null&&t.hydratedSources||null,r=!1,s="",a=FS;if(t!=null&&(t.unstable_strictMode===!0&&(r=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(a=t.onRecoverableError)),e=US(e,null,n,1,t??null,r,!1,s,a),n[hs]=e.current,Ou(n),i)for(n=0;n<i.length;n++)t=i[n],r=t._getVersion,r=r(t._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[t,r]:e.mutableSourceEagerHydrationData.push(t,r);return new Xd(e)};Gi.render=function(n,e,t){if(!Yd(e))throw Error(fe(200));return qd(null,n,e,!1,t)};Gi.unmountComponentAtNode=function(n){if(!Yd(n))throw Error(fe(40));return n._reactRootContainer?($a(function(){qd(null,null,n,!1,function(){n._reactRootContainer=null,n[hs]=null})}),!0):!1};Gi.unstable_batchedUpdates=E0;Gi.unstable_renderSubtreeIntoContainer=function(n,e,t,i){if(!Yd(t))throw Error(fe(200));if(n==null||n._reactInternals===void 0)throw Error(fe(38));return qd(n,e,t,!1,i)};Gi.version="18.3.1-next-f1338f8080-20240426";function OS(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(OS)}catch(n){console.error(n)}}OS(),Oy.exports=Gi;var yA=Oy.exports,bv=yA;Rp.createRoot=bv.createRoot,Rp.hydrateRoot=bv.hydrateRoot;const cn={brand:"faker.ren",name:"CQ",nameTail:".REN",role:"学生 / 计算机爱好者",heroSub:"一个普通的计算机爱好者，平时喜欢折腾些小东西。",avatar:"/assets/avatar.webp",bio:["我是 <strong>CQ/参群</strong>，一个还在上学的计算机爱好者。平时写点小工具、折腾服务器，也喜欢听听歌、打打游戏。","最初是为了低成本开一台 Minecraft 服务器，我开始接触 Linux，慢慢学着写脚本，后来就一直折腾到了现在。","目前做出来的完整项目还不多，希望以后能慢慢积累。"],facts:[{k:"STATUS",v:"Student"},{k:"LOCATION",v:"青岛 · Qingdao"},{k:"FOCUS",v:"Web / 嵌入式 / Linux"},{k:"STACK",v:"React · Vite · Python"}],contacts:[{label:"EMAIL",value:"cq.arn@outlook.com",href:"mailto:cq.arn@outlook.com"},{label:"GMAIL",value:"cqsomt@gmail.com",href:"mailto:cqsomt@gmail.com"},{label:"GITHUB",value:"github.com/cmdCQ",href:"https://github.com/cmdCQ"},{label:"BILIBILI",value:"b23.tv/0cfuBR5",href:"https://b23.tv/0cfuBR5"},{label:"WECHAT",value:"cqsomt",href:""}],stats:[{num:3,suffix:"+",label:"项目"},{num:3,suffix:"+",label:"GitHub Stars"},{num:1,suffix:"k",label:"提交记录"},{num:1e3,suffix:"h",label:"写代码时长"}],projects:[{title:"易三千",desc:"一个 AI 算卦项目：自动排盘，配合古籍知识库辅助解卦。",tags:["WEB","AI","ONLINE"],year:"2026",image:"/assets/projects/p-yisanqian.svg",link:"https://sqw.somtfly.com"},{title:"ccswitch-nogui",desc:"纯终端版 Claude Code 供应商切换工具，用 Python 复刻 cc-switch 主链路，内置 71 个预设，适合无桌面的服务器 / SSH 环境。",tags:["CLI","PYTHON","TOOL"],year:"2026",image:"/assets/projects/p-ccswitch.svg",link:"https://github.com/cmdCQ/ccswitch-nogui"}],contactTitleA:"一起做点",contactTitleB:"有意思的东西",contactSub:"有想法、有项目，或者只是路过想打个招呼，欢迎邮件联系。",contactMail:"cq.arn@outlook.com",socials:[{label:"GITHUB",href:"https://github.com/cmdCQ"},{label:"BILIBILI",href:"https://b23.tv/0cfuBR5"},{label:"EMAIL",href:"mailto:cq.arn@outlook.com"},{label:"GMAIL",href:"mailto:cqsomt@gmail.com"}],footer:{copyright:"© 2026 faker.ren",powered:"BUILT WITH REACT + VITE"}},SA=["LAUNCH READY","SYNC ONLINE","SIGNAL LIVE"],Rh={alpha:"ABCDEFGHIJKLMNOPQRSTUVWXYZ",alphanumeric:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",numeric:"0123456789"},bh=n=>typeof n=="number"?`${n}px`:n,MA=n=>Rh[n]?Rh[n]:typeof n=="string"&&n.length>0?n:Rh.alphanumeric,Pv=(n,e)=>String(n??"").padEnd(e," ").slice(0,e),Lc=n=>n.split("").map(e=>({current:e,next:e,flipping:!1,tick:0})),EA=n=>n.charAt(Math.floor(Math.random()*n.length))||" ",TA=(n,e,t)=>{const i=[];for(let r=0;r<e;r+=1)i.push(EA(t));return i.push(n),i},wA=()=>{const[n,e]=Ye.useState(!1);return Ye.useEffect(()=>{if(typeof window>"u"||!window.matchMedia)return;const t=window.matchMedia("(prefers-reduced-motion: reduce)"),i=()=>e(t.matches);return i(),t.addEventListener("change",i),()=>t.removeEventListener("change",i)},[]),n},AA=({words:n=["LAUNCH READY","SYNC ONLINE","SIGNAL LIVE"],text:e,flipDuration:t=.12,stagger:i=.06,cycleDelay:r=2400,charset:s="alphanumeric",flipsPerChar:a=8,tileColor:o="#111827",textColor:l="#f8fafc",tileRadius:u=8,gap:c=6,fontSize:d=52,loop:f=!0,padTo:h=12,className:m="",style:_={},...g})=>{const p=wA(),v=Ye.useRef(null),S=Ye.useRef(null),x=Ye.useRef(""),E=Array.isArray(n)&&n.length>0?n:SA,T=typeof e=="string"?e:E.map(I=>String(I??"")).join(""),w=Ye.useMemo(()=>T.split(""),[T]),y=Ye.useMemo(()=>{const I=w.reduce((F,G)=>Math.max(F,G.length),1);return Math.max(1,Math.ceil(Number(h)||0),I)},[h,w]),A=Ye.useMemo(()=>w.map(I=>Pv(I,y)),[w,y]),[R,D]=Ye.useState(()=>Lc(A[0]||""));Ye.useEffect(()=>{const I=()=>{v.current&&(cancelAnimationFrame(v.current),v.current=null),S.current&&(clearTimeout(S.current),S.current=null)};I();const F=A[0]||"";if(x.current=F,D(Lc(F)),A.length<=1||typeof window>"u")return I;let G=0,U=!1;const N=Math.max(40,(Number(t)||.12)*1e3),O=Math.max(0,(Number(i)||0)*1e3),b=Math.max(400,Number(r)||2400),Q=Math.max(0,Math.floor(Number(a)||0)),te=MA(s),Oe=Ce=>{if(p)return x.current=Ce,D(Lc(Ce)),0;const $=Pv(x.current,y),re=Ce.split("").map((me,Re)=>{const Ne=$[Re]||" ";return Ne===me?null:{index:Re,from:Ne,target:me,sequence:TA(me,Q,te),start:Re*O,step:-1,done:!1}}).filter(Boolean);if(!re.length)return x.current=Ce,D(Lc(Ce)),0;const Ae=re.reduce((me,Re)=>Math.max(me,Re.start+Re.sequence.length*N),0),De=performance.now(),ye=me=>{D(Re=>{const Ne=[...Re];return me.forEach(ke=>{const W=Ne[ke.index];W&&(Ne[ke.index]={current:ke.current,next:ke.next,flipping:!ke.done,tick:W.tick+1})}),Ne})},je=me=>{if(U)return;const Re=me-De,Ne=[];let ke=!1;re.forEach(W=>{const et=Re-W.start;if(et<0){ke=!0;return}const ut=Math.floor(et/N);ut<W.sequence.length?(ke=!0,ut!==W.step&&(W.step=ut,Ne.push({index:W.index,current:ut===0?W.from:W.sequence[ut-1],next:W.sequence[ut],done:!1}))):W.done||(W.done=!0,Ne.push({index:W.index,current:W.target,next:W.target,done:!0}))}),Ne.length>0&&ye(Ne),ke?v.current=requestAnimationFrame(je):(x.current=Ce,v.current=null)};return v.current=requestAnimationFrame(je),Ae},be=Ce=>{S.current=window.setTimeout(()=>{if(U)return;const $=G+1;if($>=A.length&&!f)return;G=$%A.length;const se=Oe(A[G]);be(b+se)},Ce)};return be(b),()=>{U=!0,I()}},[A,y,f,r,t,i,a,s,p]);const L=R.map(I=>I.current).join("").trimEnd(),z={"--split-flap-tile-color":o,"--split-flap-text-color":l,"--split-flap-radius":bh(u),"--split-flap-gap":bh(c),"--split-flap-font-size":bh(d),"--split-flap-flip-duration":`${Math.max(.04,Number(t)||.12)}s`,..._};return j.jsx("div",{className:`split-flap-text ${m}`.trim(),style:z,role:"text","aria-label":L||void 0,...g,children:R.map((I,F)=>j.jsxs("span",{className:"split-flap-text__tile","aria-hidden":"true",children:[j.jsx("span",{className:"split-flap-text__half split-flap-text__half--top",children:j.jsx("span",{className:"split-flap-text__char",children:I.current===" "?" ":I.current})}),j.jsx("span",{className:"split-flap-text__half split-flap-text__half--bottom",children:j.jsx("span",{className:"split-flap-text__char",children:I.flipping?I.next:I.current})}),I.flipping&&j.jsxs(j.Fragment,{children:[j.jsx("span",{className:"split-flap-text__flap split-flap-text__flap--front",children:j.jsx("span",{className:"split-flap-text__char",children:I.current===" "?" ":I.current})},`front-${F}-${I.tick}`),j.jsx("span",{className:"split-flap-text__flap split-flap-text__flap--back",children:j.jsx("span",{className:"split-flap-text__char",children:I.next===" "?" ":I.next})},`back-${F}-${I.tick}`)]})]},`${F}-${R.length}`))})};function CA(){const[n,e]=Ye.useState(!1);return Ye.useEffect(()=>{const t=()=>e(window.scrollY>24);return t(),window.addEventListener("scroll",t,{passive:!0}),()=>window.removeEventListener("scroll",t)},[]),j.jsx("header",{className:`nav${n?" scrolled":""}`,children:j.jsxs("div",{className:"nav-inner",children:[j.jsxs("a",{className:"brand",href:"#top","aria-label":"回到顶部",children:[j.jsx("span",{className:"brand-mark",children:"f"}),cn.brand]}),j.jsx("div",{className:"nav-flap","aria-hidden":"true",children:j.jsx(AA,{words:["LAUNCH READY","SYNC ONLINE","SIGNAL LIVE"],flipDuration:.12,stagger:.06,cycleDelay:2400,charset:"alphanumeric",flipsPerChar:8,tileColor:"#111827",textColor:"#f8fafc",tileRadius:6,gap:4,fontSize:20,loop:!0,padTo:12})}),j.jsxs("nav",{className:"nav-links","aria-label":"主导航",children:[j.jsx("a",{href:"#about",children:"经历"}),j.jsx("a",{href:"#projects",children:"项目"}),j.jsx("a",{href:"#contact",children:"联系"})]}),j.jsx("a",{className:"btn-hi",href:"#contact",children:"SAY HI"})]})})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const D0="185",RA=0,Dv=1,bA=2,Rf=1,PA=2,Ql=3,sa=0,_i=1,ts=2,ls=0,jo=1,Lv=2,Nv=3,Iv=4,DA=5,Aa=100,LA=101,NA=102,IA=103,UA=104,FA=200,OA=201,kA=202,BA=203,Sm=204,Mm=205,zA=206,VA=207,HA=208,GA=209,WA=210,XA=211,YA=212,qA=213,$A=214,Em=0,Tm=1,wm=2,pl=3,Am=4,Cm=5,Rm=6,bm=7,kS=0,KA=1,ZA=2,Br=0,BS=1,zS=2,VS=3,HS=4,GS=5,WS=6,XS=7,YS=300,Ka=301,ml=302,Ph=303,Dh=304,$d=306,Pm=1e3,ss=1001,Dm=1002,Pn=1003,jA=1004,Nc=1005,Yn=1006,Lh=1007,Da=1008,Ji=1009,qS=1010,$S=1011,Yu=1012,L0=1013,Gr=1014,Nr=1015,gs=1016,N0=1017,I0=1018,qu=1020,KS=35902,ZS=35899,jS=1021,QS=1022,gr=1023,_s=1026,La=1027,JS=1028,U0=1029,Za=1030,F0=1031,O0=1033,bf=33776,Pf=33777,Df=33778,Lf=33779,Lm=35840,Nm=35841,Im=35842,Um=35843,Fm=36196,Om=37492,km=37496,Bm=37488,zm=37489,hd=37490,Vm=37491,Hm=37808,Gm=37809,Wm=37810,Xm=37811,Ym=37812,qm=37813,$m=37814,Km=37815,Zm=37816,jm=37817,Qm=37818,Jm=37819,eg=37820,tg=37821,ng=36492,ig=36494,rg=36495,sg=36283,ag=36284,pd=36285,og=36286,QA=3200,Uv=0,JA=1,Os="",bi="srgb",md="srgb-linear",gd="linear",Mt="srgb",lo=7680,Fv=519,eC=512,tC=513,nC=514,k0=515,iC=516,rC=517,B0=518,sC=519,Ov=35044,kv="300 es",Ir=2e3,_d=2001;function aC(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function vd(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function oC(){const n=vd("canvas");return n.style.display="block",n}const Bv={};function zv(...n){const e="THREE."+n.shift();console.log(e,...n)}function eM(n){const e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function $e(...n){n=eM(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function gt(...n){n=eM(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function Qo(...n){const e=n.join(" ");e in Bv||(Bv[e]=!0,$e(...n))}function lC(n,e,t){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:i()}}setTimeout(s,t)})}const uC={[Em]:Tm,[wm]:Rm,[Am]:bm,[pl]:Cm,[Tm]:Em,[Rm]:wm,[bm]:Am,[Cm]:pl};class no{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const r=i[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const Bn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Nh=Math.PI/180,lg=180/Math.PI;function cc(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Bn[n&255]+Bn[n>>8&255]+Bn[n>>16&255]+Bn[n>>24&255]+"-"+Bn[e&255]+Bn[e>>8&255]+"-"+Bn[e>>16&15|64]+Bn[e>>24&255]+"-"+Bn[t&63|128]+Bn[t>>8&255]+"-"+Bn[t>>16&255]+Bn[t>>24&255]+Bn[i&255]+Bn[i>>8&255]+Bn[i>>16&255]+Bn[i>>24&255]).toLowerCase()}function dt(n,e,t){return Math.max(e,Math.min(t,n))}function cC(n,e){return(n%e+e)%e}function Ih(n,e,t){return(1-t)*n+t*e}function Ol(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ui(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const m_=class m_{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=dt(this.x,e.x,t.x),this.y=dt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=dt(this.x,e,t),this.y=dt(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(dt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(dt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*i-a*r+e.x,this.y=s*r+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};m_.prototype.isVector2=!0;let ht=m_;class Cl{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,a,o){let l=i[r+0],u=i[r+1],c=i[r+2],d=i[r+3],f=s[a+0],h=s[a+1],m=s[a+2],_=s[a+3];if(d!==_||l!==f||u!==h||c!==m){let g=l*f+u*h+c*m+d*_;g<0&&(f=-f,h=-h,m=-m,_=-_,g=-g);let p=1-o;if(g<.9995){const v=Math.acos(g),S=Math.sin(v);p=Math.sin(p*v)/S,o=Math.sin(o*v)/S,l=l*p+f*o,u=u*p+h*o,c=c*p+m*o,d=d*p+_*o}else{l=l*p+f*o,u=u*p+h*o,c=c*p+m*o,d=d*p+_*o;const v=1/Math.sqrt(l*l+u*u+c*c+d*d);l*=v,u*=v,c*=v,d*=v}}e[t]=l,e[t+1]=u,e[t+2]=c,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,r,s,a){const o=i[r],l=i[r+1],u=i[r+2],c=i[r+3],d=s[a],f=s[a+1],h=s[a+2],m=s[a+3];return e[t]=o*m+c*d+l*h-u*f,e[t+1]=l*m+c*f+u*d-o*h,e[t+2]=u*m+c*h+o*f-l*d,e[t+3]=c*m-o*d-l*f-u*h,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,u=o(i/2),c=o(r/2),d=o(s/2),f=l(i/2),h=l(r/2),m=l(s/2);switch(a){case"XYZ":this._x=f*c*d+u*h*m,this._y=u*h*d-f*c*m,this._z=u*c*m+f*h*d,this._w=u*c*d-f*h*m;break;case"YXZ":this._x=f*c*d+u*h*m,this._y=u*h*d-f*c*m,this._z=u*c*m-f*h*d,this._w=u*c*d+f*h*m;break;case"ZXY":this._x=f*c*d-u*h*m,this._y=u*h*d+f*c*m,this._z=u*c*m+f*h*d,this._w=u*c*d-f*h*m;break;case"ZYX":this._x=f*c*d-u*h*m,this._y=u*h*d+f*c*m,this._z=u*c*m-f*h*d,this._w=u*c*d+f*h*m;break;case"YZX":this._x=f*c*d+u*h*m,this._y=u*h*d+f*c*m,this._z=u*c*m-f*h*d,this._w=u*c*d-f*h*m;break;case"XZY":this._x=f*c*d-u*h*m,this._y=u*h*d-f*c*m,this._z=u*c*m+f*h*d,this._w=u*c*d+f*h*m;break;default:$e("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],a=t[1],o=t[5],l=t[9],u=t[2],c=t[6],d=t[10],f=i+o+d;if(f>0){const h=.5/Math.sqrt(f+1);this._w=.25/h,this._x=(c-l)*h,this._y=(s-u)*h,this._z=(a-r)*h}else if(i>o&&i>d){const h=2*Math.sqrt(1+i-o-d);this._w=(c-l)/h,this._x=.25*h,this._y=(r+a)/h,this._z=(s+u)/h}else if(o>d){const h=2*Math.sqrt(1+o-i-d);this._w=(s-u)/h,this._x=(r+a)/h,this._y=.25*h,this._z=(l+c)/h}else{const h=2*Math.sqrt(1+d-i-o);this._w=(a-r)/h,this._x=(s+u)/h,this._y=(l+c)/h,this._z=.25*h}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(dt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,a=e._w,o=t._x,l=t._y,u=t._z,c=t._w;return this._x=i*c+a*o+r*u-s*l,this._y=r*c+a*l+s*o-i*u,this._z=s*c+a*u+i*l-r*o,this._w=a*c-i*o-r*l-s*u,this._onChangeCallback(),this}slerp(e,t){let i=e._x,r=e._y,s=e._z,a=e._w,o=this.dot(e);o<0&&(i=-i,r=-r,s=-s,a=-a,o=-o);let l=1-t;if(o<.9995){const u=Math.acos(o),c=Math.sin(u);l=Math.sin(l*u)/c,t=Math.sin(t*u)/c,this._x=this._x*l+i*t,this._y=this._y*l+r*t,this._z=this._z*l+s*t,this._w=this._w*l+a*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+r*t,this._z=this._z*l+s*t,this._w=this._w*l+a*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const g_=class g_{constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Vv.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Vv.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,o=e.z,l=e.w,u=2*(a*r-o*i),c=2*(o*t-s*r),d=2*(s*i-a*t);return this.x=t+l*u+a*d-o*c,this.y=i+l*c+o*u-s*d,this.z=r+l*d+s*c-a*u,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=dt(this.x,e.x,t.x),this.y=dt(this.y,e.y,t.y),this.z=dt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=dt(this.x,e,t),this.y=dt(this.y,e,t),this.z=dt(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(dt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=r*l-s*o,this.y=s*a-i*l,this.z=i*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Uh.copy(this).projectOnVector(e),this.sub(Uh)}reflect(e){return this.sub(Uh.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(dt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};g_.prototype.isVector3=!0;let Z=g_;const Uh=new Z,Vv=new Cl,__=class __{constructor(e,t,i,r,s,a,o,l,u){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,u)}set(e,t,i,r,s,a,o,l,u){const c=this.elements;return c[0]=e,c[1]=r,c[2]=o,c[3]=t,c[4]=s,c[5]=l,c[6]=i,c[7]=a,c[8]=u,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[3],l=i[6],u=i[1],c=i[4],d=i[7],f=i[2],h=i[5],m=i[8],_=r[0],g=r[3],p=r[6],v=r[1],S=r[4],x=r[7],E=r[2],T=r[5],w=r[8];return s[0]=a*_+o*v+l*E,s[3]=a*g+o*S+l*T,s[6]=a*p+o*x+l*w,s[1]=u*_+c*v+d*E,s[4]=u*g+c*S+d*T,s[7]=u*p+c*x+d*w,s[2]=f*_+h*v+m*E,s[5]=f*g+h*S+m*T,s[8]=f*p+h*x+m*w,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],u=e[7],c=e[8];return t*a*c-t*o*u-i*s*c+i*o*l+r*s*u-r*a*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],u=e[7],c=e[8],d=c*a-o*u,f=o*l-c*s,h=u*s-a*l,m=t*d+i*f+r*h;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/m;return e[0]=d*_,e[1]=(r*u-c*i)*_,e[2]=(o*i-r*a)*_,e[3]=f*_,e[4]=(c*t-r*l)*_,e[5]=(r*s-o*t)*_,e[6]=h*_,e[7]=(i*l-u*t)*_,e[8]=(a*t-i*s)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,a,o){const l=Math.cos(s),u=Math.sin(s);return this.set(i*l,i*u,-i*(l*a+u*o)+a+e,-r*u,r*l,-r*(-u*a+l*o)+o+t,0,0,1),this}scale(e,t){return Qo("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Fh.makeScale(e,t)),this}rotate(e){return Qo("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Fh.makeRotation(-e)),this}translate(e,t){return Qo("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Fh.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}};__.prototype.isMatrix3=!0;let Qe=__;const Fh=new Qe,Hv=new Qe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Gv=new Qe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function fC(){const n={enabled:!0,workingColorSpace:md,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===Mt&&(r.r=us(r.r),r.g=us(r.g),r.b=us(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Mt&&(r.r=Jo(r.r),r.g=Jo(r.g),r.b=Jo(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Os?gd:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return Qo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return Qo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[md]:{primaries:e,whitePoint:i,transfer:gd,toXYZ:Hv,fromXYZ:Gv,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:bi},outputColorSpaceConfig:{drawingBufferColorSpace:bi}},[bi]:{primaries:e,whitePoint:i,transfer:Mt,toXYZ:Hv,fromXYZ:Gv,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:bi}}}),n}const ft=fC();function us(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Jo(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let uo;class dC{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{uo===void 0&&(uo=vd("canvas")),uo.width=e.width,uo.height=e.height;const r=uo.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=uo}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=vd("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=us(s[a]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(us(t[i]/255)*255):t[i]=us(t[i]);return{data:t,width:e.width,height:e.height}}else return $e("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let hC=0;class z0{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:hC++}),this.uuid=cc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(Oh(r[a].image)):s.push(Oh(r[a]))}else s=Oh(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function Oh(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?dC.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:($e("Texture: Unable to serialize Texture."),{})}let pC=0;const kh=new Z;class ai extends no{constructor(e=ai.DEFAULT_IMAGE,t=ai.DEFAULT_MAPPING,i=ss,r=ss,s=Yn,a=Da,o=gr,l=Ji,u=ai.DEFAULT_ANISOTROPY,c=Os){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:pC++}),this.uuid=cc(),this.name="",this.source=new z0(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=u,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ht(0,0),this.repeat=new ht(1,1),this.center=new ht(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Qe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=c,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(kh).x}get height(){return this.source.getSize(kh).y}get depth(){return this.source.getSize(kh).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){$e(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){$e(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==YS)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Pm:e.x=e.x-Math.floor(e.x);break;case ss:e.x=e.x<0?0:1;break;case Dm:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Pm:e.y=e.y-Math.floor(e.y);break;case ss:e.y=e.y<0?0:1;break;case Dm:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}ai.DEFAULT_IMAGE=null;ai.DEFAULT_MAPPING=YS;ai.DEFAULT_ANISOTROPY=1;const v_=class v_{constructor(e=0,t=0,i=0,r=1){this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*i+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*i+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*i+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const l=e.elements,u=l[0],c=l[4],d=l[8],f=l[1],h=l[5],m=l[9],_=l[2],g=l[6],p=l[10];if(Math.abs(c-f)<.01&&Math.abs(d-_)<.01&&Math.abs(m-g)<.01){if(Math.abs(c+f)<.1&&Math.abs(d+_)<.1&&Math.abs(m+g)<.1&&Math.abs(u+h+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const S=(u+1)/2,x=(h+1)/2,E=(p+1)/2,T=(c+f)/4,w=(d+_)/4,y=(m+g)/4;return S>x&&S>E?S<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(S),r=T/i,s=w/i):x>E?x<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(x),i=T/r,s=y/r):E<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(E),i=w/s,r=y/s),this.set(i,r,s,t),this}let v=Math.sqrt((g-m)*(g-m)+(d-_)*(d-_)+(f-c)*(f-c));return Math.abs(v)<.001&&(v=1),this.x=(g-m)/v,this.y=(d-_)/v,this.z=(f-c)/v,this.w=Math.acos((u+h+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=dt(this.x,e.x,t.x),this.y=dt(this.y,e.y,t.y),this.z=dt(this.z,e.z,t.z),this.w=dt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=dt(this.x,e,t),this.y=dt(this.y,e,t),this.z=dt(this.z,e,t),this.w=dt(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(dt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};v_.prototype.isVector4=!0;let Zt=v_;class mC extends no{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Yn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new Zt(0,0,e,t),this.scissorTest=!1,this.viewport=new Zt(0,0,e,t),this.textures=[];const r={width:e,height:t,depth:i.depth},s=new ai(r),a=i.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Yn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new z0(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class zr extends mC{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class tM extends ai{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Pn,this.minFilter=Pn,this.wrapR=ss,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class gC extends ai{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Pn,this.minFilter=Pn,this.wrapR=ss,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Dd=class Dd{constructor(e,t,i,r,s,a,o,l,u,c,d,f,h,m,_,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,u,c,d,f,h,m,_,g)}set(e,t,i,r,s,a,o,l,u,c,d,f,h,m,_,g){const p=this.elements;return p[0]=e,p[4]=t,p[8]=i,p[12]=r,p[1]=s,p[5]=a,p[9]=o,p[13]=l,p[2]=u,p[6]=c,p[10]=d,p[14]=f,p[3]=h,p[7]=m,p[11]=_,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Dd().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,i=e.elements,r=1/co.setFromMatrixColumn(e,0).length(),s=1/co.setFromMatrixColumn(e,1).length(),a=1/co.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(r),u=Math.sin(r),c=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){const f=a*c,h=a*d,m=o*c,_=o*d;t[0]=l*c,t[4]=-l*d,t[8]=u,t[1]=h+m*u,t[5]=f-_*u,t[9]=-o*l,t[2]=_-f*u,t[6]=m+h*u,t[10]=a*l}else if(e.order==="YXZ"){const f=l*c,h=l*d,m=u*c,_=u*d;t[0]=f+_*o,t[4]=m*o-h,t[8]=a*u,t[1]=a*d,t[5]=a*c,t[9]=-o,t[2]=h*o-m,t[6]=_+f*o,t[10]=a*l}else if(e.order==="ZXY"){const f=l*c,h=l*d,m=u*c,_=u*d;t[0]=f-_*o,t[4]=-a*d,t[8]=m+h*o,t[1]=h+m*o,t[5]=a*c,t[9]=_-f*o,t[2]=-a*u,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const f=a*c,h=a*d,m=o*c,_=o*d;t[0]=l*c,t[4]=m*u-h,t[8]=f*u+_,t[1]=l*d,t[5]=_*u+f,t[9]=h*u-m,t[2]=-u,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const f=a*l,h=a*u,m=o*l,_=o*u;t[0]=l*c,t[4]=_-f*d,t[8]=m*d+h,t[1]=d,t[5]=a*c,t[9]=-o*c,t[2]=-u*c,t[6]=h*d+m,t[10]=f-_*d}else if(e.order==="XZY"){const f=a*l,h=a*u,m=o*l,_=o*u;t[0]=l*c,t[4]=-d,t[8]=u*c,t[1]=f*d+_,t[5]=a*c,t[9]=h*d-m,t[2]=m*d-h,t[6]=o*c,t[10]=_*d+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(_C,e,vC)}lookAt(e,t,i){const r=this.elements;return Ti.subVectors(e,t),Ti.lengthSq()===0&&(Ti.z=1),Ti.normalize(),As.crossVectors(i,Ti),As.lengthSq()===0&&(Math.abs(i.z)===1?Ti.x+=1e-4:Ti.z+=1e-4,Ti.normalize(),As.crossVectors(i,Ti)),As.normalize(),Ic.crossVectors(Ti,As),r[0]=As.x,r[4]=Ic.x,r[8]=Ti.x,r[1]=As.y,r[5]=Ic.y,r[9]=Ti.y,r[2]=As.z,r[6]=Ic.z,r[10]=Ti.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[4],l=i[8],u=i[12],c=i[1],d=i[5],f=i[9],h=i[13],m=i[2],_=i[6],g=i[10],p=i[14],v=i[3],S=i[7],x=i[11],E=i[15],T=r[0],w=r[4],y=r[8],A=r[12],R=r[1],D=r[5],L=r[9],z=r[13],I=r[2],F=r[6],G=r[10],U=r[14],N=r[3],O=r[7],b=r[11],Q=r[15];return s[0]=a*T+o*R+l*I+u*N,s[4]=a*w+o*D+l*F+u*O,s[8]=a*y+o*L+l*G+u*b,s[12]=a*A+o*z+l*U+u*Q,s[1]=c*T+d*R+f*I+h*N,s[5]=c*w+d*D+f*F+h*O,s[9]=c*y+d*L+f*G+h*b,s[13]=c*A+d*z+f*U+h*Q,s[2]=m*T+_*R+g*I+p*N,s[6]=m*w+_*D+g*F+p*O,s[10]=m*y+_*L+g*G+p*b,s[14]=m*A+_*z+g*U+p*Q,s[3]=v*T+S*R+x*I+E*N,s[7]=v*w+S*D+x*F+E*O,s[11]=v*y+S*L+x*G+E*b,s[15]=v*A+S*z+x*U+E*Q,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],a=e[1],o=e[5],l=e[9],u=e[13],c=e[2],d=e[6],f=e[10],h=e[14],m=e[3],_=e[7],g=e[11],p=e[15],v=l*h-u*f,S=o*h-u*d,x=o*f-l*d,E=a*h-u*c,T=a*f-l*c,w=a*d-o*c;return t*(_*v-g*S+p*x)-i*(m*v-g*E+p*T)+r*(m*S-_*E+p*w)-s*(m*x-_*T+g*w)}determinantAffine(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[1],a=e[5],o=e[9],l=e[2],u=e[6],c=e[10];return t*(a*c-o*u)-i*(s*c-o*l)+r*(s*u-a*l)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],u=e[7],c=e[8],d=e[9],f=e[10],h=e[11],m=e[12],_=e[13],g=e[14],p=e[15],v=t*o-i*a,S=t*l-r*a,x=t*u-s*a,E=i*l-r*o,T=i*u-s*o,w=r*u-s*l,y=c*_-d*m,A=c*g-f*m,R=c*p-h*m,D=d*g-f*_,L=d*p-h*_,z=f*p-h*g,I=v*z-S*L+x*D+E*R-T*A+w*y;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const F=1/I;return e[0]=(o*z-l*L+u*D)*F,e[1]=(r*L-i*z-s*D)*F,e[2]=(_*w-g*T+p*E)*F,e[3]=(f*T-d*w-h*E)*F,e[4]=(l*R-a*z-u*A)*F,e[5]=(t*z-r*R+s*A)*F,e[6]=(g*x-m*w-p*S)*F,e[7]=(c*w-f*x+h*S)*F,e[8]=(a*L-o*R+u*y)*F,e[9]=(i*R-t*L-s*y)*F,e[10]=(m*T-_*x+p*v)*F,e[11]=(d*x-c*T-h*v)*F,e[12]=(o*A-a*D-l*y)*F,e[13]=(t*D-i*A+r*y)*F,e[14]=(_*S-m*E-g*v)*F,e[15]=(c*E-d*S+f*v)*F,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,a=e.x,o=e.y,l=e.z,u=s*a,c=s*o;return this.set(u*a+i,u*o-r*l,u*l+r*o,0,u*o+r*l,c*o+i,c*l-r*a,0,u*l-r*o,c*l+r*a,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,a){return this.set(1,i,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,u=s+s,c=a+a,d=o+o,f=s*u,h=s*c,m=s*d,_=a*c,g=a*d,p=o*d,v=l*u,S=l*c,x=l*d,E=i.x,T=i.y,w=i.z;return r[0]=(1-(_+p))*E,r[1]=(h+x)*E,r[2]=(m-S)*E,r[3]=0,r[4]=(h-x)*T,r[5]=(1-(f+p))*T,r[6]=(g+v)*T,r[7]=0,r[8]=(m+S)*w,r[9]=(g-v)*w,r[10]=(1-(f+_))*w,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];const s=this.determinantAffine();if(s===0)return i.set(1,1,1),t.identity(),this;let a=co.set(r[0],r[1],r[2]).length();const o=co.set(r[4],r[5],r[6]).length(),l=co.set(r[8],r[9],r[10]).length();s<0&&(a=-a),lr.copy(this);const u=1/a,c=1/o,d=1/l;return lr.elements[0]*=u,lr.elements[1]*=u,lr.elements[2]*=u,lr.elements[4]*=c,lr.elements[5]*=c,lr.elements[6]*=c,lr.elements[8]*=d,lr.elements[9]*=d,lr.elements[10]*=d,t.setFromRotationMatrix(lr),i.x=a,i.y=o,i.z=l,this}makePerspective(e,t,i,r,s,a,o=Ir,l=!1){const u=this.elements,c=2*s/(t-e),d=2*s/(i-r),f=(t+e)/(t-e),h=(i+r)/(i-r);let m,_;if(l)m=s/(a-s),_=a*s/(a-s);else if(o===Ir)m=-(a+s)/(a-s),_=-2*a*s/(a-s);else if(o===_d)m=-a/(a-s),_=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return u[0]=c,u[4]=0,u[8]=f,u[12]=0,u[1]=0,u[5]=d,u[9]=h,u[13]=0,u[2]=0,u[6]=0,u[10]=m,u[14]=_,u[3]=0,u[7]=0,u[11]=-1,u[15]=0,this}makeOrthographic(e,t,i,r,s,a,o=Ir,l=!1){const u=this.elements,c=2/(t-e),d=2/(i-r),f=-(t+e)/(t-e),h=-(i+r)/(i-r);let m,_;if(l)m=1/(a-s),_=a/(a-s);else if(o===Ir)m=-2/(a-s),_=-(a+s)/(a-s);else if(o===_d)m=-1/(a-s),_=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return u[0]=c,u[4]=0,u[8]=0,u[12]=f,u[1]=0,u[5]=d,u[9]=0,u[13]=h,u[2]=0,u[6]=0,u[10]=m,u[14]=_,u[3]=0,u[7]=0,u[11]=0,u[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}};Dd.prototype.isMatrix4=!0;let hn=Dd;const co=new Z,lr=new hn,_C=new Z(0,0,0),vC=new Z(1,1,1),As=new Z,Ic=new Z,Ti=new Z,Wv=new hn,Xv=new Cl;let $u=class nM{constructor(e=0,t=0,i=0,r=nM.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],l=r[1],u=r[5],c=r[9],d=r[2],f=r[6],h=r[10];switch(t){case"XYZ":this._y=Math.asin(dt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-c,h),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(f,u),this._z=0);break;case"YXZ":this._x=Math.asin(-dt(c,-1,1)),Math.abs(c)<.9999999?(this._y=Math.atan2(o,h),this._z=Math.atan2(l,u)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(dt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-d,h),this._z=Math.atan2(-a,u)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-dt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(f,h),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,u));break;case"YZX":this._z=Math.asin(dt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-c,u),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,h));break;case"XZY":this._z=Math.asin(-dt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,u),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-c,h),this._y=0);break;default:$e("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Wv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Wv,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Xv.setFromEuler(this),this.setFromQuaternion(Xv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};$u.DEFAULT_ORDER="XYZ";class iM{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let xC=0;const Yv=new Z,fo=new Cl,Yr=new hn,Uc=new Z,kl=new Z,yC=new Z,SC=new Cl,qv=new Z(1,0,0),$v=new Z(0,1,0),Kv=new Z(0,0,1),Zv={type:"added"},MC={type:"removed"},ho={type:"childadded",child:null},Bh={type:"childremoved",child:null};class ki extends no{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:xC++}),this.uuid=cc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ki.DEFAULT_UP.clone();const e=new Z,t=new $u,i=new Cl,r=new Z(1,1,1);function s(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new hn},normalMatrix:{value:new Qe}}),this.matrix=new hn,this.matrixWorld=new hn,this.matrixAutoUpdate=ki.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ki.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new iM,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return fo.setFromAxisAngle(e,t),this.quaternion.multiply(fo),this}rotateOnWorldAxis(e,t){return fo.setFromAxisAngle(e,t),this.quaternion.premultiply(fo),this}rotateX(e){return this.rotateOnAxis(qv,e)}rotateY(e){return this.rotateOnAxis($v,e)}rotateZ(e){return this.rotateOnAxis(Kv,e)}translateOnAxis(e,t){return Yv.copy(e).applyQuaternion(this.quaternion),this.position.add(Yv.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(qv,e)}translateY(e){return this.translateOnAxis($v,e)}translateZ(e){return this.translateOnAxis(Kv,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Yr.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Uc.copy(e):Uc.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),kl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Yr.lookAt(kl,Uc,this.up):Yr.lookAt(Uc,kl,this.up),this.quaternion.setFromRotationMatrix(Yr),r&&(Yr.extractRotation(r.matrixWorld),fo.setFromRotationMatrix(Yr),this.quaternion.premultiply(fo.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(gt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Zv),ho.child=e,this.dispatchEvent(ho),ho.child=null):gt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(MC),Bh.child=e,this.dispatchEvent(Bh),Bh.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Yr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Yr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Yr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Zv),ho.child=e,this.dispatchEvent(ho),ho.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(kl,e,yC),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(kl,SC,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,r=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*i-s[8]*r,s[13]+=i-s[1]*t-s[5]*i-s[9]*r,s[14]+=r-s[2]*t-s[6]*i-s[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t,i=!1){const r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),t===!0){const s=this.children;for(let a=0,o=s.length;a<o;a++)s[a].updateWorldMatrix(!1,!0,i)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let u=0,c=l.length;u<c;u++){const d=l[u];s(e.shapes,d)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,u=this.material.length;l<u;l++)o.push(s(e.materials,this.material[l]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(s(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),u=a(e.textures),c=a(e.images),d=a(e.shapes),f=a(e.skeletons),h=a(e.animations),m=a(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),u.length>0&&(i.textures=u),c.length>0&&(i.images=c),d.length>0&&(i.shapes=d),f.length>0&&(i.skeletons=f),h.length>0&&(i.animations=h),m.length>0&&(i.nodes=m)}return i.object=r,i;function a(o){const l=[];for(const u in o){const c=o[u];delete c.metadata,l.push(c)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}ki.DEFAULT_UP=new Z(0,1,0);ki.DEFAULT_MATRIX_AUTO_UPDATE=!0;ki.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Fc extends ki{constructor(){super(),this.isGroup=!0,this.type="Group"}}const EC={type:"move"};class zh{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Fc,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Fc,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new Z,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new Z),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Fc,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new Z,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new Z,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,a=null;const o=this._targetRay,l=this._grip,u=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(u&&e.hand){a=!0;for(const _ of e.hand.values()){const g=t.getJointPose(_,i),p=this._getHandJoint(u,_);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}const c=u.joints["index-finger-tip"],d=u.joints["thumb-tip"],f=c.position.distanceTo(d.position),h=.02,m=.005;u.inputState.pinching&&f>h+m?(u.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!u.inputState.pinching&&f<=h-m&&(u.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(EC)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),u!==null&&(u.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Fc;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const rM={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Cs={h:0,s:0,l:0},Oc={h:0,s:0,l:0};function Vh(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class vt{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=bi){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ft.colorSpaceToWorking(this,t),this}setRGB(e,t,i,r=ft.workingColorSpace){return this.r=e,this.g=t,this.b=i,ft.colorSpaceToWorking(this,r),this}setHSL(e,t,i,r=ft.workingColorSpace){if(e=cC(e,1),t=dt(t,0,1),i=dt(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,a=2*i-s;this.r=Vh(a,s,e+1/3),this.g=Vh(a,s,e),this.b=Vh(a,s,e-1/3)}return ft.colorSpaceToWorking(this,r),this}setStyle(e,t=bi){function i(s){s!==void 0&&parseFloat(s)<1&&$e("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:$e("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);$e("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=bi){const i=rM[e.toLowerCase()];return i!==void 0?this.setHex(i,t):$e("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=us(e.r),this.g=us(e.g),this.b=us(e.b),this}copyLinearToSRGB(e){return this.r=Jo(e.r),this.g=Jo(e.g),this.b=Jo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=bi){return ft.workingToColorSpace(zn.copy(this),e),Math.round(dt(zn.r*255,0,255))*65536+Math.round(dt(zn.g*255,0,255))*256+Math.round(dt(zn.b*255,0,255))}getHexString(e=bi){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ft.workingColorSpace){ft.workingToColorSpace(zn.copy(this),t);const i=zn.r,r=zn.g,s=zn.b,a=Math.max(i,r,s),o=Math.min(i,r,s);let l,u;const c=(o+a)/2;if(o===a)l=0,u=0;else{const d=a-o;switch(u=c<=.5?d/(a+o):d/(2-a-o),a){case i:l=(r-s)/d+(r<s?6:0);break;case r:l=(s-i)/d+2;break;case s:l=(i-r)/d+4;break}l/=6}return e.h=l,e.s=u,e.l=c,e}getRGB(e,t=ft.workingColorSpace){return ft.workingToColorSpace(zn.copy(this),t),e.r=zn.r,e.g=zn.g,e.b=zn.b,e}getStyle(e=bi){ft.workingToColorSpace(zn.copy(this),e);const t=zn.r,i=zn.g,r=zn.b;return e!==bi?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(Cs),this.setHSL(Cs.h+e,Cs.s+t,Cs.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Cs),e.getHSL(Oc);const i=Ih(Cs.h,Oc.h,t),r=Ih(Cs.s,Oc.s,t),s=Ih(Cs.l,Oc.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const zn=new vt;vt.NAMES=rM;class TC extends ki{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new $u,this.environmentIntensity=1,this.environmentRotation=new $u,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const ur=new Z,qr=new Z,Hh=new Z,$r=new Z,po=new Z,mo=new Z,jv=new Z,Gh=new Z,Wh=new Z,Xh=new Z,Yh=new Zt,qh=new Zt,$h=new Zt;let Bl=class Co{constructor(e=new Z,t=new Z,i=new Z){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),ur.subVectors(e,t),r.cross(ur);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){ur.subVectors(r,t),qr.subVectors(i,t),Hh.subVectors(e,t);const a=ur.dot(ur),o=ur.dot(qr),l=ur.dot(Hh),u=qr.dot(qr),c=qr.dot(Hh),d=a*u-o*o;if(d===0)return s.set(0,0,0),null;const f=1/d,h=(u*l-o*c)*f,m=(a*c-o*l)*f;return s.set(1-h-m,m,h)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,$r)===null?!1:$r.x>=0&&$r.y>=0&&$r.x+$r.y<=1}static getInterpolation(e,t,i,r,s,a,o,l){return this.getBarycoord(e,t,i,r,$r)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,$r.x),l.addScaledVector(a,$r.y),l.addScaledVector(o,$r.z),l)}static getInterpolatedAttribute(e,t,i,r,s,a){return Yh.setScalar(0),qh.setScalar(0),$h.setScalar(0),Yh.fromBufferAttribute(e,t),qh.fromBufferAttribute(e,i),$h.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Yh,s.x),a.addScaledVector(qh,s.y),a.addScaledVector($h,s.z),a}static isFrontFacing(e,t,i,r){return ur.subVectors(i,t),qr.subVectors(e,t),ur.cross(qr).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return ur.subVectors(this.c,this.b),qr.subVectors(this.a,this.b),ur.cross(qr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Co.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Co.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return Co.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return Co.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Co.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let a,o;po.subVectors(r,i),mo.subVectors(s,i),Gh.subVectors(e,i);const l=po.dot(Gh),u=mo.dot(Gh);if(l<=0&&u<=0)return t.copy(i);Wh.subVectors(e,r);const c=po.dot(Wh),d=mo.dot(Wh);if(c>=0&&d<=c)return t.copy(r);const f=l*d-c*u;if(f<=0&&l>=0&&c<=0)return a=l/(l-c),t.copy(i).addScaledVector(po,a);Xh.subVectors(e,s);const h=po.dot(Xh),m=mo.dot(Xh);if(m>=0&&h<=m)return t.copy(s);const _=h*u-l*m;if(_<=0&&u>=0&&m<=0)return o=u/(u-m),t.copy(i).addScaledVector(mo,o);const g=c*m-h*d;if(g<=0&&d-c>=0&&h-m>=0)return jv.subVectors(s,r),o=(d-c)/(d-c+(h-m)),t.copy(r).addScaledVector(jv,o);const p=1/(g+_+f);return a=_*p,o=f*p,t.copy(i).addScaledVector(po,a).addScaledVector(mo,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}};class fc{constructor(e=new Z(1/0,1/0,1/0),t=new Z(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(cr.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(cr.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=cr.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,cr):cr.fromBufferAttribute(s,a),cr.applyMatrix4(e.matrixWorld),this.expandByPoint(cr);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),kc.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),kc.copy(i.boundingBox)),kc.applyMatrix4(e.matrixWorld),this.union(kc)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,cr),cr.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(zl),Bc.subVectors(this.max,zl),go.subVectors(e.a,zl),_o.subVectors(e.b,zl),vo.subVectors(e.c,zl),Rs.subVectors(_o,go),bs.subVectors(vo,_o),pa.subVectors(go,vo);let t=[0,-Rs.z,Rs.y,0,-bs.z,bs.y,0,-pa.z,pa.y,Rs.z,0,-Rs.x,bs.z,0,-bs.x,pa.z,0,-pa.x,-Rs.y,Rs.x,0,-bs.y,bs.x,0,-pa.y,pa.x,0];return!Kh(t,go,_o,vo,Bc)||(t=[1,0,0,0,1,0,0,0,1],!Kh(t,go,_o,vo,Bc))?!1:(zc.crossVectors(Rs,bs),t=[zc.x,zc.y,zc.z],Kh(t,go,_o,vo,Bc))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,cr).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(cr).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Kr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Kr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Kr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Kr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Kr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Kr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Kr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Kr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Kr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Kr=[new Z,new Z,new Z,new Z,new Z,new Z,new Z,new Z],cr=new Z,kc=new fc,go=new Z,_o=new Z,vo=new Z,Rs=new Z,bs=new Z,pa=new Z,zl=new Z,Bc=new Z,zc=new Z,ma=new Z;function Kh(n,e,t,i,r){for(let s=0,a=n.length-3;s<=a;s+=3){ma.fromArray(n,s);const o=r.x*Math.abs(ma.x)+r.y*Math.abs(ma.y)+r.z*Math.abs(ma.z),l=e.dot(ma),u=t.dot(ma),c=i.dot(ma);if(Math.max(-Math.max(l,u,c),Math.min(l,u,c))>o)return!1}return!0}const on=new Z,Vc=new ht;let wC=0;class Vr extends no{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:wC++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Ov,this.updateRanges=[],this.gpuType=Nr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Vc.fromBufferAttribute(this,t),Vc.applyMatrix3(e),this.setXY(t,Vc.x,Vc.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)on.fromBufferAttribute(this,t),on.applyMatrix3(e),this.setXYZ(t,on.x,on.y,on.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)on.fromBufferAttribute(this,t),on.applyMatrix4(e),this.setXYZ(t,on.x,on.y,on.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)on.fromBufferAttribute(this,t),on.applyNormalMatrix(e),this.setXYZ(t,on.x,on.y,on.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)on.fromBufferAttribute(this,t),on.transformDirection(e),this.setXYZ(t,on.x,on.y,on.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Ol(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ui(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ol(t,this.array)),t}setX(e,t){return this.normalized&&(t=ui(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ol(t,this.array)),t}setY(e,t){return this.normalized&&(t=ui(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ol(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ui(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ol(t,this.array)),t}setW(e,t){return this.normalized&&(t=ui(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=ui(t,this.array),i=ui(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=ui(t,this.array),i=ui(i,this.array),r=ui(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=ui(t,this.array),i=ui(i,this.array),r=ui(r,this.array),s=ui(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Ov&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class sM extends Vr{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class aM extends Vr{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class cs extends Vr{constructor(e,t,i){super(new Float32Array(e),t,i)}}const AC=new fc,Vl=new Z,Zh=new Z;class V0{constructor(e=new Z,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):AC.setFromPoints(e).getCenter(i);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Vl.subVectors(e,this.center);const t=Vl.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(Vl,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Zh.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Vl.copy(e.center).add(Zh)),this.expandByPoint(Vl.copy(e.center).sub(Zh))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let CC=0;const qi=new hn,jh=new ki,xo=new Z,wi=new fc,Hl=new fc,En=new Z;class Ss extends no{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:CC++}),this.uuid=cc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(aC(e)?aM:sM)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Qe().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return qi.makeRotationFromQuaternion(e),this.applyMatrix4(qi),this}rotateX(e){return qi.makeRotationX(e),this.applyMatrix4(qi),this}rotateY(e){return qi.makeRotationY(e),this.applyMatrix4(qi),this}rotateZ(e){return qi.makeRotationZ(e),this.applyMatrix4(qi),this}translate(e,t,i){return qi.makeTranslation(e,t,i),this.applyMatrix4(qi),this}scale(e,t,i){return qi.makeScale(e,t,i),this.applyMatrix4(qi),this}lookAt(e){return jh.lookAt(e),jh.updateMatrix(),this.applyMatrix4(jh.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(xo).negate(),this.translate(xo.x,xo.y,xo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let r=0,s=e.length;r<s;r++){const a=e[r];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new cs(i,3))}else{const i=Math.min(e.length,t.count);for(let r=0;r<i;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&$e("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new fc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){gt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new Z(-1/0,-1/0,-1/0),new Z(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];wi.setFromBufferAttribute(s),this.morphTargetsRelative?(En.addVectors(this.boundingBox.min,wi.min),this.boundingBox.expandByPoint(En),En.addVectors(this.boundingBox.max,wi.max),this.boundingBox.expandByPoint(En)):(this.boundingBox.expandByPoint(wi.min),this.boundingBox.expandByPoint(wi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&gt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new V0);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){gt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new Z,1/0);return}if(e){const i=this.boundingSphere.center;if(wi.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];Hl.setFromBufferAttribute(o),this.morphTargetsRelative?(En.addVectors(wi.min,Hl.min),wi.expandByPoint(En),En.addVectors(wi.max,Hl.max),wi.expandByPoint(En)):(wi.expandByPoint(Hl.min),wi.expandByPoint(Hl.max))}wi.getCenter(i);let r=0;for(let s=0,a=e.count;s<a;s++)En.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(En));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],l=this.morphTargetsRelative;for(let u=0,c=o.count;u<c;u++)En.fromBufferAttribute(o,u),l&&(xo.fromBufferAttribute(e,u),En.add(xo)),r=Math.max(r,i.distanceToSquared(En))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&gt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){gt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,s=t.uv;let a=this.getAttribute("tangent");(a===void 0||a.count!==i.count)&&(a=new Vr(new Float32Array(4*i.count),4),this.setAttribute("tangent",a));const o=[],l=[];for(let y=0;y<i.count;y++)o[y]=new Z,l[y]=new Z;const u=new Z,c=new Z,d=new Z,f=new ht,h=new ht,m=new ht,_=new Z,g=new Z;function p(y,A,R){u.fromBufferAttribute(i,y),c.fromBufferAttribute(i,A),d.fromBufferAttribute(i,R),f.fromBufferAttribute(s,y),h.fromBufferAttribute(s,A),m.fromBufferAttribute(s,R),c.sub(u),d.sub(u),h.sub(f),m.sub(f);const D=1/(h.x*m.y-m.x*h.y);isFinite(D)&&(_.copy(c).multiplyScalar(m.y).addScaledVector(d,-h.y).multiplyScalar(D),g.copy(d).multiplyScalar(h.x).addScaledVector(c,-m.x).multiplyScalar(D),o[y].add(_),o[A].add(_),o[R].add(_),l[y].add(g),l[A].add(g),l[R].add(g))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let y=0,A=v.length;y<A;++y){const R=v[y],D=R.start,L=R.count;for(let z=D,I=D+L;z<I;z+=3)p(e.getX(z+0),e.getX(z+1),e.getX(z+2))}const S=new Z,x=new Z,E=new Z,T=new Z;function w(y){E.fromBufferAttribute(r,y),T.copy(E);const A=o[y];S.copy(A),S.sub(E.multiplyScalar(E.dot(A))).normalize(),x.crossVectors(T,A);const D=x.dot(l[y])<0?-1:1;a.setXYZW(y,S.x,S.y,S.z,D)}for(let y=0,A=v.length;y<A;++y){const R=v[y],D=R.start,L=R.count;for(let z=D,I=D+L;z<I;z+=3)w(e.getX(z+0)),w(e.getX(z+1)),w(e.getX(z+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==t.count)i=new Vr(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let f=0,h=i.count;f<h;f++)i.setXYZ(f,0,0,0);const r=new Z,s=new Z,a=new Z,o=new Z,l=new Z,u=new Z,c=new Z,d=new Z;if(e)for(let f=0,h=e.count;f<h;f+=3){const m=e.getX(f+0),_=e.getX(f+1),g=e.getX(f+2);r.fromBufferAttribute(t,m),s.fromBufferAttribute(t,_),a.fromBufferAttribute(t,g),c.subVectors(a,s),d.subVectors(r,s),c.cross(d),o.fromBufferAttribute(i,m),l.fromBufferAttribute(i,_),u.fromBufferAttribute(i,g),o.add(c),l.add(c),u.add(c),i.setXYZ(m,o.x,o.y,o.z),i.setXYZ(_,l.x,l.y,l.z),i.setXYZ(g,u.x,u.y,u.z)}else for(let f=0,h=t.count;f<h;f+=3)r.fromBufferAttribute(t,f+0),s.fromBufferAttribute(t,f+1),a.fromBufferAttribute(t,f+2),c.subVectors(a,s),d.subVectors(r,s),c.cross(d),i.setXYZ(f+0,c.x,c.y,c.z),i.setXYZ(f+1,c.x,c.y,c.z),i.setXYZ(f+2,c.x,c.y,c.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)En.fromBufferAttribute(e,t),En.normalize(),e.setXYZ(t,En.x,En.y,En.z)}toNonIndexed(){function e(o,l){const u=o.array,c=o.itemSize,d=o.normalized,f=new u.constructor(l.length*c);let h=0,m=0;for(let _=0,g=l.length;_<g;_++){o.isInterleavedBufferAttribute?h=l[_]*o.data.stride+o.offset:h=l[_]*c;for(let p=0;p<c;p++)f[m++]=u[h++]}return new Vr(f,c,d)}if(this.index===null)return $e("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ss,i=this.index.array,r=this.attributes;for(const o in r){const l=r[o],u=e(l,i);t.setAttribute(o,u)}const s=this.morphAttributes;for(const o in s){const l=[],u=s[o];for(let c=0,d=u.length;c<d;c++){const f=u[c],h=e(f,i);l.push(h)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const u=a[o];t.addGroup(u.start,u.count,u.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const u in l)l[u]!==void 0&&(e[u]=l[u]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const u=i[l];e.data.attributes[l]=u.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const u=this.morphAttributes[l],c=[];for(let d=0,f=u.length;d<f;d++){const h=u[d];c.push(h.toJSON(e.data))}c.length>0&&(r[l]=c,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const r=e.attributes;for(const u in r){const c=r[u];this.setAttribute(u,c.clone(t))}const s=e.morphAttributes;for(const u in s){const c=[],d=s[u];for(let f=0,h=d.length;f<h;f++)c.push(d[f].clone(t));this.morphAttributes[u]=c}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let u=0,c=a.length;u<c;u++){const d=a[u];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let RC=0;class Kd extends no{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:RC++}),this.uuid=cc(),this.name="",this.type="Material",this.blending=jo,this.side=sa,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Sm,this.blendDst=Mm,this.blendEquation=Aa,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new vt(0,0,0),this.blendAlpha=0,this.depthFunc=pl,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Fv,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=lo,this.stencilZFail=lo,this.stencilZPass=lo,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){$e(`Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){$e(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector2&&i&&i.isVector2||r&&r.isEuler&&i&&i.isEuler||r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==jo&&(i.blending=this.blending),this.side!==sa&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Sm&&(i.blendSrc=this.blendSrc),this.blendDst!==Mm&&(i.blendDst=this.blendDst),this.blendEquation!==Aa&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==pl&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Fv&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==lo&&(i.stencilFail=this.stencilFail),this.stencilZFail!==lo&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==lo&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const a=[];for(const o in s){const l=s[o];delete l.metadata,a.push(l)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(i.textures=s),a.length>0&&(i.images=a)}return i}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new vt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let i=e.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new ht().fromArray(i)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ht().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Zr=new Z,Qh=new Z,Hc=new Z,Ps=new Z,Jh=new Z,Gc=new Z,ep=new Z;class bC{constructor(e=new Z,t=new Z(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Zr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Zr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Zr.copy(this.origin).addScaledVector(this.direction,t),Zr.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){Qh.copy(e).add(t).multiplyScalar(.5),Hc.copy(t).sub(e).normalize(),Ps.copy(this.origin).sub(Qh);const s=e.distanceTo(t)*.5,a=-this.direction.dot(Hc),o=Ps.dot(this.direction),l=-Ps.dot(Hc),u=Ps.lengthSq(),c=Math.abs(1-a*a);let d,f,h,m;if(c>0)if(d=a*l-o,f=a*o-l,m=s*c,d>=0)if(f>=-m)if(f<=m){const _=1/c;d*=_,f*=_,h=d*(d+a*f+2*o)+f*(a*d+f+2*l)+u}else f=s,d=Math.max(0,-(a*f+o)),h=-d*d+f*(f+2*l)+u;else f=-s,d=Math.max(0,-(a*f+o)),h=-d*d+f*(f+2*l)+u;else f<=-m?(d=Math.max(0,-(-a*s+o)),f=d>0?-s:Math.min(Math.max(-s,-l),s),h=-d*d+f*(f+2*l)+u):f<=m?(d=0,f=Math.min(Math.max(-s,-l),s),h=f*(f+2*l)+u):(d=Math.max(0,-(a*s+o)),f=d>0?s:Math.min(Math.max(-s,-l),s),h=-d*d+f*(f+2*l)+u);else f=a>0?-s:s,d=Math.max(0,-(a*f+o)),h=-d*d+f*(f+2*l)+u;return i&&i.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(Qh).addScaledVector(Hc,f),h}intersectSphere(e,t){Zr.subVectors(e.center,this.origin);const i=Zr.dot(this.direction),r=Zr.dot(Zr)-i*i,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,a,o,l;const u=1/this.direction.x,c=1/this.direction.y,d=1/this.direction.z,f=this.origin;return u>=0?(i=(e.min.x-f.x)*u,r=(e.max.x-f.x)*u):(i=(e.max.x-f.x)*u,r=(e.min.x-f.x)*u),c>=0?(s=(e.min.y-f.y)*c,a=(e.max.y-f.y)*c):(s=(e.max.y-f.y)*c,a=(e.min.y-f.y)*c),i>a||s>r||((s>i||isNaN(i))&&(i=s),(a<r||isNaN(r))&&(r=a),d>=0?(o=(e.min.z-f.z)*d,l=(e.max.z-f.z)*d):(o=(e.max.z-f.z)*d,l=(e.min.z-f.z)*d),i>l||o>r)||((o>i||i!==i)&&(i=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,Zr)!==null}intersectTriangle(e,t,i,r,s){Jh.subVectors(t,e),Gc.subVectors(i,e),ep.crossVectors(Jh,Gc);let a=this.direction.dot(ep),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Ps.subVectors(this.origin,e);const l=o*this.direction.dot(Gc.crossVectors(Ps,Gc));if(l<0)return null;const u=o*this.direction.dot(Jh.cross(Ps));if(u<0||l+u>a)return null;const c=-o*Ps.dot(ep);return c<0?null:this.at(c/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class oM extends Kd{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new vt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new $u,this.combine=kS,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Qv=new hn,ga=new bC,Wc=new V0,Jv=new Z,Xc=new Z,Yc=new Z,qc=new Z,tp=new Z,$c=new Z,ex=new Z,Kc=new Z;let Wr=class extends ki{constructor(e=new Ss,t=new oM){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){$c.set(0,0,0);for(let l=0,u=s.length;l<u;l++){const c=o[l],d=s[l];c!==0&&(tp.fromBufferAttribute(d,e),a?$c.addScaledVector(tp,c):$c.addScaledVector(tp.sub(t),c))}t.add($c)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Wc.copy(i.boundingSphere),Wc.applyMatrix4(s),ga.copy(e.ray).recast(e.near),!(Wc.containsPoint(ga.origin)===!1&&(ga.intersectSphere(Wc,Jv)===null||ga.origin.distanceToSquared(Jv)>(e.far-e.near)**2))&&(Qv.copy(s).invert(),ga.copy(e.ray).applyMatrix4(Qv),!(i.boundingBox!==null&&ga.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,ga)))}_computeIntersections(e,t,i){let r;const s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,u=s.attributes.uv,c=s.attributes.uv1,d=s.attributes.normal,f=s.groups,h=s.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,_=f.length;m<_;m++){const g=f[m],p=a[g.materialIndex],v=Math.max(g.start,h.start),S=Math.min(o.count,Math.min(g.start+g.count,h.start+h.count));for(let x=v,E=S;x<E;x+=3){const T=o.getX(x),w=o.getX(x+1),y=o.getX(x+2);r=Zc(this,p,e,i,u,c,d,T,w,y),r&&(r.faceIndex=Math.floor(x/3),r.face.materialIndex=g.materialIndex,t.push(r))}}else{const m=Math.max(0,h.start),_=Math.min(o.count,h.start+h.count);for(let g=m,p=_;g<p;g+=3){const v=o.getX(g),S=o.getX(g+1),x=o.getX(g+2);r=Zc(this,a,e,i,u,c,d,v,S,x),r&&(r.faceIndex=Math.floor(g/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let m=0,_=f.length;m<_;m++){const g=f[m],p=a[g.materialIndex],v=Math.max(g.start,h.start),S=Math.min(l.count,Math.min(g.start+g.count,h.start+h.count));for(let x=v,E=S;x<E;x+=3){const T=x,w=x+1,y=x+2;r=Zc(this,p,e,i,u,c,d,T,w,y),r&&(r.faceIndex=Math.floor(x/3),r.face.materialIndex=g.materialIndex,t.push(r))}}else{const m=Math.max(0,h.start),_=Math.min(l.count,h.start+h.count);for(let g=m,p=_;g<p;g+=3){const v=g,S=g+1,x=g+2;r=Zc(this,a,e,i,u,c,d,v,S,x),r&&(r.faceIndex=Math.floor(g/3),t.push(r))}}}};function PC(n,e,t,i,r,s,a,o){let l;if(e.side===_i?l=i.intersectTriangle(a,s,r,!0,o):l=i.intersectTriangle(r,s,a,e.side===sa,o),l===null)return null;Kc.copy(o),Kc.applyMatrix4(n.matrixWorld);const u=t.ray.origin.distanceTo(Kc);return u<t.near||u>t.far?null:{distance:u,point:Kc.clone(),object:n}}function Zc(n,e,t,i,r,s,a,o,l,u){n.getVertexPosition(o,Xc),n.getVertexPosition(l,Yc),n.getVertexPosition(u,qc);const c=PC(n,e,t,i,Xc,Yc,qc,ex);if(c){const d=new Z;Bl.getBarycoord(ex,Xc,Yc,qc,d),r&&(c.uv=Bl.getInterpolatedAttribute(r,o,l,u,d,new ht)),s&&(c.uv1=Bl.getInterpolatedAttribute(s,o,l,u,d,new ht)),a&&(c.normal=Bl.getInterpolatedAttribute(a,o,l,u,d,new Z),c.normal.dot(i.direction)>0&&c.normal.multiplyScalar(-1));const f={a:o,b:l,c:u,normal:new Z,materialIndex:0};Bl.getNormal(Xc,Yc,qc,f.normal),c.face=f,c.barycoord=d}return c}class DC extends ai{constructor(e=null,t=1,i=1,r,s,a,o,l,u=Pn,c=Pn,d,f){super(null,a,o,l,u,c,r,s,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const np=new Z,LC=new Z,NC=new Qe;class Ma{constructor(e=new Z(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=np.subVectors(i,t).cross(LC.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){const r=e.delta(np),s=this.normal.dot(r);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const a=-(e.start.dot(this.normal)+this.constant)/s;return i===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||NC.getNormalMatrix(e),r=this.coplanarPoint(np).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const _a=new V0,IC=new ht(.5,.5),jc=new Z;class lM{constructor(e=new Ma,t=new Ma,i=new Ma,r=new Ma,s=new Ma,a=new Ma){this.planes=[e,t,i,r,s,a]}set(e,t,i,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Ir,i=!1){const r=this.planes,s=e.elements,a=s[0],o=s[1],l=s[2],u=s[3],c=s[4],d=s[5],f=s[6],h=s[7],m=s[8],_=s[9],g=s[10],p=s[11],v=s[12],S=s[13],x=s[14],E=s[15];if(r[0].setComponents(u-a,h-c,p-m,E-v).normalize(),r[1].setComponents(u+a,h+c,p+m,E+v).normalize(),r[2].setComponents(u+o,h+d,p+_,E+S).normalize(),r[3].setComponents(u-o,h-d,p-_,E-S).normalize(),i)r[4].setComponents(l,f,g,x).normalize(),r[5].setComponents(u-l,h-f,p-g,E-x).normalize();else if(r[4].setComponents(u-l,h-f,p-g,E-x).normalize(),t===Ir)r[5].setComponents(u+l,h+f,p+g,E+x).normalize();else if(t===_d)r[5].setComponents(l,f,g,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),_a.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),_a.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(_a)}intersectsSprite(e){_a.center.set(0,0,0);const t=IC.distanceTo(e.center);return _a.radius=.7071067811865476+t,_a.applyMatrix4(e.matrixWorld),this.intersectsSphere(_a)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(jc.x=r.normal.x>0?e.max.x:e.min.x,jc.y=r.normal.y>0?e.max.y:e.min.y,jc.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(jc)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class uM extends ai{constructor(e=[],t=Ka,i,r,s,a,o,l,u,c){super(e,t,i,r,s,a,o,l,u,c),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class gl extends ai{constructor(e,t,i=Gr,r,s,a,o=Pn,l=Pn,u,c=_s,d=1){if(c!==_s&&c!==La)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const f={width:e,height:t,depth:d};super(f,r,s,a,o,l,c,i,u),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new z0(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class UC extends gl{constructor(e,t=Gr,i=Ka,r,s,a=Pn,o=Pn,l,u=_s){const c={width:e,height:e,depth:1},d=[c,c,c,c,c,c];super(e,e,t,i,r,s,a,o,l,u),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class cM extends ai{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class dc extends Ss{constructor(e=1,t=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const l=[],u=[],c=[],d=[];let f=0,h=0;m("z","y","x",-1,-1,i,t,e,a,s,0),m("z","y","x",1,-1,i,t,-e,a,s,1),m("x","z","y",1,1,e,i,t,r,a,2),m("x","z","y",1,-1,e,i,-t,r,a,3),m("x","y","z",1,-1,e,t,i,r,s,4),m("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new cs(u,3)),this.setAttribute("normal",new cs(c,3)),this.setAttribute("uv",new cs(d,2));function m(_,g,p,v,S,x,E,T,w,y,A){const R=x/w,D=E/y,L=x/2,z=E/2,I=T/2,F=w+1,G=y+1;let U=0,N=0;const O=new Z;for(let b=0;b<G;b++){const Q=b*D-z;for(let te=0;te<F;te++){const Oe=te*R-L;O[_]=Oe*v,O[g]=Q*S,O[p]=I,u.push(O.x,O.y,O.z),O[_]=0,O[g]=0,O[p]=T>0?1:-1,c.push(O.x,O.y,O.z),d.push(te/w),d.push(1-b/y),U+=1}}for(let b=0;b<y;b++)for(let Q=0;Q<w;Q++){const te=f+Q+F*b,Oe=f+Q+F*(b+1),be=f+(Q+1)+F*(b+1),Ce=f+(Q+1)+F*b;l.push(te,Oe,Ce),l.push(Oe,be,Ce),N+=6}o.addGroup(h,N,A),h+=N,f+=U}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new dc(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class hc extends Ss{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(i),l=Math.floor(r),u=o+1,c=l+1,d=e/o,f=t/l,h=[],m=[],_=[],g=[];for(let p=0;p<c;p++){const v=p*f-a;for(let S=0;S<u;S++){const x=S*d-s;m.push(x,-v,0),_.push(0,0,1),g.push(S/o),g.push(1-p/l)}}for(let p=0;p<l;p++)for(let v=0;v<o;v++){const S=v+u*p,x=v+u*(p+1),E=v+1+u*(p+1),T=v+1+u*p;h.push(S,x,T),h.push(x,E,T)}this.setIndex(h),this.setAttribute("position",new cs(m,3)),this.setAttribute("normal",new cs(_,3)),this.setAttribute("uv",new cs(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new hc(e.width,e.height,e.widthSegments,e.heightSegments)}}function _l(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];if(tx(r))r.isRenderTargetTexture?($e("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone();else if(Array.isArray(r))if(tx(r[0])){const s=[];for(let a=0,o=r.length;a<o;a++)s[a]=r[a].clone();e[t][i]=s}else e[t][i]=r.slice();else e[t][i]=r}}return e}function Jn(n){const e={};for(let t=0;t<n.length;t++){const i=_l(n[t]);for(const r in i)e[r]=i[r]}return e}function tx(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function FC(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function fM(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ft.workingColorSpace}const OC={clone:_l,merge:Jn};var kC=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,BC=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Sr extends Kd{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=kC,this.fragmentShader=BC,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=_l(e.uniforms),this.uniformsGroups=FC(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const i in e.uniforms){const r=e.uniforms[i];switch(this.uniforms[i]={},r.type){case"t":this.uniforms[i].value=t[r.value]||null;break;case"c":this.uniforms[i].value=new vt().setHex(r.value);break;case"v2":this.uniforms[i].value=new ht().fromArray(r.value);break;case"v3":this.uniforms[i].value=new Z().fromArray(r.value);break;case"v4":this.uniforms[i].value=new Zt().fromArray(r.value);break;case"m3":this.uniforms[i].value=new Qe().fromArray(r.value);break;case"m4":this.uniforms[i].value=new hn().fromArray(r.value);break;default:this.uniforms[i].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const i in e.extensions)this.extensions[i]=e.extensions[i];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class zC extends Sr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class VC extends Kd{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=QA,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class HC extends Kd{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Qc=new Z,Jc=new Cl,wr=new Z;class dM extends ki{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new hn,this.projectionMatrix=new hn,this.projectionMatrixInverse=new hn,this.coordinateSystem=Ir,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Qc,Jc,wr),wr.x===1&&wr.y===1&&wr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Qc,Jc,wr.set(1,1,1)).invert()}updateWorldMatrix(e,t,i=!1){super.updateWorldMatrix(e,t,i),this.matrixWorld.decompose(Qc,Jc,wr),wr.x===1&&wr.y===1&&wr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Qc,Jc,wr.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Ds=new Z,nx=new ht,ix=new ht;class mr extends dM{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=lg*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Nh*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return lg*2*Math.atan(Math.tan(Nh*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){Ds.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ds.x,Ds.y).multiplyScalar(-e/Ds.z),Ds.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Ds.x,Ds.y).multiplyScalar(-e/Ds.z)}getViewSize(e,t){return this.getViewBounds(e,nx,ix),t.subVectors(ix,nx)}setViewOffset(e,t,i,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Nh*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,u=a.fullHeight;s+=a.offsetX*r/l,t-=a.offsetY*i/u,r*=a.width/l,i*=a.height/u}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class H0 extends dM{constructor(e=-1,t=1,i=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,a=i+e,o=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const u=(this.right-this.left)/this.view.fullWidth/this.zoom,c=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=u*this.view.offsetX,a=s+u*this.view.width,o-=c*this.view.offsetY,l=o-c*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const yo=-90,So=1;class GC extends ki{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new mr(yo,So,e,t);r.layers=this.layers,this.add(r);const s=new mr(yo,So,e,t);s.layers=this.layers,this.add(s);const a=new mr(yo,So,e,t);a.layers=this.layers,this.add(a);const o=new mr(yo,So,e,t);o.layers=this.layers,this.add(o);const l=new mr(yo,So,e,t);l.layers=this.layers,this.add(l);const u=new mr(yo,So,e,t);u.layers=this.layers,this.add(u)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,a,o,l]=t;for(const u of t)this.remove(u);if(e===Ir)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===_d)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const u of t)this.add(u),u.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,l,u,c]=this.children,d=e.getRenderTarget(),f=e.getActiveCubeFace(),h=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;const _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(i,0,r),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(i,1,r),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,2,r),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(i,3,r),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,4,r),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),i.texture.generateMipmaps=_,e.setRenderTarget(i,5,r),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(d,f,h),e.xr.enabled=m,i.texture.needsPMREMUpdate=!0}}class WC extends mr{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class XC{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,$e("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const x_=class x_{constructor(e,t,i,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,r){const s=this.elements;return s[0]=e,s[2]=t,s[1]=i,s[3]=r,this}};x_.prototype.isMatrix2=!0;let rx=x_;function sx(n,e,t,i){const r=YC(i);switch(t){case jS:return n*e;case JS:return n*e/r.components*r.byteLength;case U0:return n*e/r.components*r.byteLength;case Za:return n*e*2/r.components*r.byteLength;case F0:return n*e*2/r.components*r.byteLength;case QS:return n*e*3/r.components*r.byteLength;case gr:return n*e*4/r.components*r.byteLength;case O0:return n*e*4/r.components*r.byteLength;case bf:case Pf:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Df:case Lf:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Nm:case Um:return Math.max(n,16)*Math.max(e,8)/4;case Lm:case Im:return Math.max(n,8)*Math.max(e,8)/2;case Fm:case Om:case Bm:case zm:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case km:case hd:case Vm:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Hm:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Gm:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case Wm:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Xm:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Ym:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case qm:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case $m:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case Km:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case Zm:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case jm:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Qm:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case Jm:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case eg:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case tg:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case ng:case ig:case rg:return Math.ceil(n/4)*Math.ceil(e/4)*16;case sg:case ag:return Math.ceil(n/4)*Math.ceil(e/4)*8;case pd:case og:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function YC(n){switch(n){case Ji:case qS:return{byteLength:1,components:1};case Yu:case $S:case gs:return{byteLength:2,components:1};case N0:case I0:return{byteLength:2,components:4};case Gr:case L0:case Nr:return{byteLength:4,components:1};case KS:case ZS:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:D0}}));typeof window<"u"&&(window.__THREE__?$e("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=D0);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function hM(){let n=null,e=!1,t=null,i=null;function r(s,a){t(s,a),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&n!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function qC(n){const e=new WeakMap;function t(o,l){const u=o.array,c=o.usage,d=u.byteLength,f=n.createBuffer();n.bindBuffer(l,f),n.bufferData(l,u,c),o.onUploadCallback();let h;if(u instanceof Float32Array)h=n.FLOAT;else if(typeof Float16Array<"u"&&u instanceof Float16Array)h=n.HALF_FLOAT;else if(u instanceof Uint16Array)o.isFloat16BufferAttribute?h=n.HALF_FLOAT:h=n.UNSIGNED_SHORT;else if(u instanceof Int16Array)h=n.SHORT;else if(u instanceof Uint32Array)h=n.UNSIGNED_INT;else if(u instanceof Int32Array)h=n.INT;else if(u instanceof Int8Array)h=n.BYTE;else if(u instanceof Uint8Array)h=n.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)h=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:f,type:h,bytesPerElement:u.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,l,u){const c=l.array,d=l.updateRanges;if(n.bindBuffer(u,o),d.length===0)n.bufferSubData(u,0,c);else{d.sort((h,m)=>h.start-m.start);let f=0;for(let h=1;h<d.length;h++){const m=d[f],_=d[h];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++f,d[f]=_)}d.length=f+1;for(let h=0,m=d.length;h<m;h++){const _=d[h];n.bufferSubData(u,_.start*c.BYTES_PER_ELEMENT,c,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(n.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const c=e.get(o);(!c||c.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const u=e.get(o);if(u===void 0)e.set(o,t(o,l));else if(u.version<o.version){if(u.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(u.buffer,o,l),u.version=o.version}}return{get:r,remove:s,update:a}}var $C=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,KC=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,ZC=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,jC=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,QC=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,JC=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,eR=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,tR=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,nR=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,iR=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,rR=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,sR=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,aR=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,oR=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,lR=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,uR=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,cR=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,fR=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,dR=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,hR=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,pR=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,mR=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,gR=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,_R=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,vR=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,xR=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,yR=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,SR=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,MR=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ER=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,TR="gl_FragColor = linearToOutputTexel( gl_FragColor );",wR=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,AR=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,CR=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,RR=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,bR=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,PR=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,DR=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,LR=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,NR=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,IR=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,UR=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,FR=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,OR=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,kR=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,BR=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,zR=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,VR=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,HR=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,GR=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,WR=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,XR=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,YR=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,qR=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,$R=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,KR=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ZR=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,jR=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,QR=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,JR=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,e2=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,t2=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,n2=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,i2=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,r2=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,s2=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,a2=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,o2=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,l2=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,u2=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,c2=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,f2=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,d2=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,h2=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,p2=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,m2=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,g2=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,_2=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,v2=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,x2=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,y2=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,S2=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,M2=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,E2=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,T2=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,w2=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,A2=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,C2=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,R2=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,b2=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,P2=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,D2=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,L2=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,N2=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,I2=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,U2=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,F2=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,O2=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,k2=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,B2=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,z2=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,V2=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,H2=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,G2=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,W2=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,X2=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Y2=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,q2=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const $2=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,K2=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Z2=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,j2=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Q2=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,J2=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,eb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,tb=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,nb=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,ib=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,rb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,sb=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ab=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,ob=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,lb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,ub=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,cb=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fb=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,db=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,hb=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pb=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,mb=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,gb=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_b=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vb=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,xb=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yb=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sb=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mb=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Eb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Tb=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,wb=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ab=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Cb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,tt={alphahash_fragment:$C,alphahash_pars_fragment:KC,alphamap_fragment:ZC,alphamap_pars_fragment:jC,alphatest_fragment:QC,alphatest_pars_fragment:JC,aomap_fragment:eR,aomap_pars_fragment:tR,batching_pars_vertex:nR,batching_vertex:iR,begin_vertex:rR,beginnormal_vertex:sR,bsdfs:aR,iridescence_fragment:oR,bumpmap_pars_fragment:lR,clipping_planes_fragment:uR,clipping_planes_pars_fragment:cR,clipping_planes_pars_vertex:fR,clipping_planes_vertex:dR,color_fragment:hR,color_pars_fragment:pR,color_pars_vertex:mR,color_vertex:gR,common:_R,cube_uv_reflection_fragment:vR,defaultnormal_vertex:xR,displacementmap_pars_vertex:yR,displacementmap_vertex:SR,emissivemap_fragment:MR,emissivemap_pars_fragment:ER,colorspace_fragment:TR,colorspace_pars_fragment:wR,envmap_fragment:AR,envmap_common_pars_fragment:CR,envmap_pars_fragment:RR,envmap_pars_vertex:bR,envmap_physical_pars_fragment:zR,envmap_vertex:PR,fog_vertex:DR,fog_pars_vertex:LR,fog_fragment:NR,fog_pars_fragment:IR,gradientmap_pars_fragment:UR,lightmap_pars_fragment:FR,lights_lambert_fragment:OR,lights_lambert_pars_fragment:kR,lights_pars_begin:BR,lights_toon_fragment:VR,lights_toon_pars_fragment:HR,lights_phong_fragment:GR,lights_phong_pars_fragment:WR,lights_physical_fragment:XR,lights_physical_pars_fragment:YR,lights_fragment_begin:qR,lights_fragment_maps:$R,lights_fragment_end:KR,lightprobes_pars_fragment:ZR,logdepthbuf_fragment:jR,logdepthbuf_pars_fragment:QR,logdepthbuf_pars_vertex:JR,logdepthbuf_vertex:e2,map_fragment:t2,map_pars_fragment:n2,map_particle_fragment:i2,map_particle_pars_fragment:r2,metalnessmap_fragment:s2,metalnessmap_pars_fragment:a2,morphinstance_vertex:o2,morphcolor_vertex:l2,morphnormal_vertex:u2,morphtarget_pars_vertex:c2,morphtarget_vertex:f2,normal_fragment_begin:d2,normal_fragment_maps:h2,normal_pars_fragment:p2,normal_pars_vertex:m2,normal_vertex:g2,normalmap_pars_fragment:_2,clearcoat_normal_fragment_begin:v2,clearcoat_normal_fragment_maps:x2,clearcoat_pars_fragment:y2,iridescence_pars_fragment:S2,opaque_fragment:M2,packing:E2,premultiplied_alpha_fragment:T2,project_vertex:w2,dithering_fragment:A2,dithering_pars_fragment:C2,roughnessmap_fragment:R2,roughnessmap_pars_fragment:b2,shadowmap_pars_fragment:P2,shadowmap_pars_vertex:D2,shadowmap_vertex:L2,shadowmask_pars_fragment:N2,skinbase_vertex:I2,skinning_pars_vertex:U2,skinning_vertex:F2,skinnormal_vertex:O2,specularmap_fragment:k2,specularmap_pars_fragment:B2,tonemapping_fragment:z2,tonemapping_pars_fragment:V2,transmission_fragment:H2,transmission_pars_fragment:G2,uv_pars_fragment:W2,uv_pars_vertex:X2,uv_vertex:Y2,worldpos_vertex:q2,background_vert:$2,background_frag:K2,backgroundCube_vert:Z2,backgroundCube_frag:j2,cube_vert:Q2,cube_frag:J2,depth_vert:eb,depth_frag:tb,distance_vert:nb,distance_frag:ib,equirect_vert:rb,equirect_frag:sb,linedashed_vert:ab,linedashed_frag:ob,meshbasic_vert:lb,meshbasic_frag:ub,meshlambert_vert:cb,meshlambert_frag:fb,meshmatcap_vert:db,meshmatcap_frag:hb,meshnormal_vert:pb,meshnormal_frag:mb,meshphong_vert:gb,meshphong_frag:_b,meshphysical_vert:vb,meshphysical_frag:xb,meshtoon_vert:yb,meshtoon_frag:Sb,points_vert:Mb,points_frag:Eb,shadow_vert:Tb,shadow_frag:wb,sprite_vert:Ab,sprite_frag:Cb},Te={common:{diffuse:{value:new vt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Qe},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Qe}},envmap:{envMap:{value:null},envMapRotation:{value:new Qe},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Qe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Qe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Qe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Qe},normalScale:{value:new ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Qe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Qe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Qe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Qe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new vt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new Z},probesMax:{value:new Z},probesResolution:{value:new Z}},points:{diffuse:{value:new vt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0},uvTransform:{value:new Qe}},sprite:{diffuse:{value:new vt(16777215)},opacity:{value:1},center:{value:new ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Qe},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0}}},Pr={basic:{uniforms:Jn([Te.common,Te.specularmap,Te.envmap,Te.aomap,Te.lightmap,Te.fog]),vertexShader:tt.meshbasic_vert,fragmentShader:tt.meshbasic_frag},lambert:{uniforms:Jn([Te.common,Te.specularmap,Te.envmap,Te.aomap,Te.lightmap,Te.emissivemap,Te.bumpmap,Te.normalmap,Te.displacementmap,Te.fog,Te.lights,{emissive:{value:new vt(0)},envMapIntensity:{value:1}}]),vertexShader:tt.meshlambert_vert,fragmentShader:tt.meshlambert_frag},phong:{uniforms:Jn([Te.common,Te.specularmap,Te.envmap,Te.aomap,Te.lightmap,Te.emissivemap,Te.bumpmap,Te.normalmap,Te.displacementmap,Te.fog,Te.lights,{emissive:{value:new vt(0)},specular:{value:new vt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:tt.meshphong_vert,fragmentShader:tt.meshphong_frag},standard:{uniforms:Jn([Te.common,Te.envmap,Te.aomap,Te.lightmap,Te.emissivemap,Te.bumpmap,Te.normalmap,Te.displacementmap,Te.roughnessmap,Te.metalnessmap,Te.fog,Te.lights,{emissive:{value:new vt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:tt.meshphysical_vert,fragmentShader:tt.meshphysical_frag},toon:{uniforms:Jn([Te.common,Te.aomap,Te.lightmap,Te.emissivemap,Te.bumpmap,Te.normalmap,Te.displacementmap,Te.gradientmap,Te.fog,Te.lights,{emissive:{value:new vt(0)}}]),vertexShader:tt.meshtoon_vert,fragmentShader:tt.meshtoon_frag},matcap:{uniforms:Jn([Te.common,Te.bumpmap,Te.normalmap,Te.displacementmap,Te.fog,{matcap:{value:null}}]),vertexShader:tt.meshmatcap_vert,fragmentShader:tt.meshmatcap_frag},points:{uniforms:Jn([Te.points,Te.fog]),vertexShader:tt.points_vert,fragmentShader:tt.points_frag},dashed:{uniforms:Jn([Te.common,Te.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:tt.linedashed_vert,fragmentShader:tt.linedashed_frag},depth:{uniforms:Jn([Te.common,Te.displacementmap]),vertexShader:tt.depth_vert,fragmentShader:tt.depth_frag},normal:{uniforms:Jn([Te.common,Te.bumpmap,Te.normalmap,Te.displacementmap,{opacity:{value:1}}]),vertexShader:tt.meshnormal_vert,fragmentShader:tt.meshnormal_frag},sprite:{uniforms:Jn([Te.sprite,Te.fog]),vertexShader:tt.sprite_vert,fragmentShader:tt.sprite_frag},background:{uniforms:{uvTransform:{value:new Qe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:tt.background_vert,fragmentShader:tt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Qe}},vertexShader:tt.backgroundCube_vert,fragmentShader:tt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:tt.cube_vert,fragmentShader:tt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:tt.equirect_vert,fragmentShader:tt.equirect_frag},distance:{uniforms:Jn([Te.common,Te.displacementmap,{referencePosition:{value:new Z},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:tt.distance_vert,fragmentShader:tt.distance_frag},shadow:{uniforms:Jn([Te.lights,Te.fog,{color:{value:new vt(0)},opacity:{value:1}}]),vertexShader:tt.shadow_vert,fragmentShader:tt.shadow_frag}};Pr.physical={uniforms:Jn([Pr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Qe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Qe},clearcoatNormalScale:{value:new ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Qe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Qe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Qe},sheen:{value:0},sheenColor:{value:new vt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Qe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Qe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Qe},transmissionSamplerSize:{value:new ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Qe},attenuationDistance:{value:0},attenuationColor:{value:new vt(0)},specularColor:{value:new vt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Qe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Qe},anisotropyVector:{value:new ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Qe}}]),vertexShader:tt.meshphysical_vert,fragmentShader:tt.meshphysical_frag};const ef={r:0,b:0,g:0},Rb=new hn,pM=new Qe;pM.set(-1,0,0,0,1,0,0,0,1);function bb(n,e,t,i,r,s){const a=new vt(0);let o=r===!0?0:1,l,u,c=null,d=0,f=null;function h(v){let S=v.isScene===!0?v.background:null;if(S&&S.isTexture){const x=v.backgroundBlurriness>0;S=e.get(S,x)}return S}function m(v){let S=!1;const x=h(v);x===null?g(a,o):x&&x.isColor&&(g(x,1),S=!0);const E=n.xr.getEnvironmentBlendMode();E==="additive"?t.buffers.color.setClear(0,0,0,1,s):E==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(n.autoClear||S)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function _(v,S){const x=h(S);x&&(x.isCubeTexture||x.mapping===$d)?(u===void 0&&(u=new Wr(new dc(1,1,1),new Sr({name:"BackgroundCubeMaterial",uniforms:_l(Pr.backgroundCube.uniforms),vertexShader:Pr.backgroundCube.vertexShader,fragmentShader:Pr.backgroundCube.fragmentShader,side:_i,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(E,T,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(u)),u.material.uniforms.envMap.value=x,u.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Rb.makeRotationFromEuler(S.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&u.material.uniforms.backgroundRotation.value.premultiply(pM),u.material.toneMapped=ft.getTransfer(x.colorSpace)!==Mt,(c!==x||d!==x.version||f!==n.toneMapping)&&(u.material.needsUpdate=!0,c=x,d=x.version,f=n.toneMapping),u.layers.enableAll(),v.unshift(u,u.geometry,u.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new Wr(new hc(2,2),new Sr({name:"BackgroundMaterial",uniforms:_l(Pr.background.uniforms),vertexShader:Pr.background.vertexShader,fragmentShader:Pr.background.fragmentShader,side:sa,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,l.material.toneMapped=ft.getTransfer(x.colorSpace)!==Mt,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(c!==x||d!==x.version||f!==n.toneMapping)&&(l.material.needsUpdate=!0,c=x,d=x.version,f=n.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null))}function g(v,S){v.getRGB(ef,fM(n)),t.buffers.color.setClear(ef.r,ef.g,ef.b,S,s)}function p(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(v,S=1){a.set(v),o=S,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(v){o=v,g(a,o)},render:m,addToRenderList:_,dispose:p}}function Pb(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=f(null);let s=r,a=!1;function o(D,L,z,I,F){let G=!1;const U=d(D,I,z,L);s!==U&&(s=U,u(s.object)),G=h(D,I,z,F),G&&m(D,I,z,F),F!==null&&e.update(F,n.ELEMENT_ARRAY_BUFFER),(G||a)&&(a=!1,x(D,L,z,I),F!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(F).buffer))}function l(){return n.createVertexArray()}function u(D){return n.bindVertexArray(D)}function c(D){return n.deleteVertexArray(D)}function d(D,L,z,I){const F=I.wireframe===!0;let G=i[L.id];G===void 0&&(G={},i[L.id]=G);const U=D.isInstancedMesh===!0?D.id:0;let N=G[U];N===void 0&&(N={},G[U]=N);let O=N[z.id];O===void 0&&(O={},N[z.id]=O);let b=O[F];return b===void 0&&(b=f(l()),O[F]=b),b}function f(D){const L=[],z=[],I=[];for(let F=0;F<t;F++)L[F]=0,z[F]=0,I[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:z,attributeDivisors:I,object:D,attributes:{},index:null}}function h(D,L,z,I){const F=s.attributes,G=L.attributes;let U=0;const N=z.getAttributes();for(const O in N)if(N[O].location>=0){const Q=F[O];let te=G[O];if(te===void 0&&(O==="instanceMatrix"&&D.instanceMatrix&&(te=D.instanceMatrix),O==="instanceColor"&&D.instanceColor&&(te=D.instanceColor)),Q===void 0||Q.attribute!==te||te&&Q.data!==te.data)return!0;U++}return s.attributesNum!==U||s.index!==I}function m(D,L,z,I){const F={},G=L.attributes;let U=0;const N=z.getAttributes();for(const O in N)if(N[O].location>=0){let Q=G[O];Q===void 0&&(O==="instanceMatrix"&&D.instanceMatrix&&(Q=D.instanceMatrix),O==="instanceColor"&&D.instanceColor&&(Q=D.instanceColor));const te={};te.attribute=Q,Q&&Q.data&&(te.data=Q.data),F[O]=te,U++}s.attributes=F,s.attributesNum=U,s.index=I}function _(){const D=s.newAttributes;for(let L=0,z=D.length;L<z;L++)D[L]=0}function g(D){p(D,0)}function p(D,L){const z=s.newAttributes,I=s.enabledAttributes,F=s.attributeDivisors;z[D]=1,I[D]===0&&(n.enableVertexAttribArray(D),I[D]=1),F[D]!==L&&(n.vertexAttribDivisor(D,L),F[D]=L)}function v(){const D=s.newAttributes,L=s.enabledAttributes;for(let z=0,I=L.length;z<I;z++)L[z]!==D[z]&&(n.disableVertexAttribArray(z),L[z]=0)}function S(D,L,z,I,F,G,U){U===!0?n.vertexAttribIPointer(D,L,z,F,G):n.vertexAttribPointer(D,L,z,I,F,G)}function x(D,L,z,I){_();const F=I.attributes,G=z.getAttributes(),U=L.defaultAttributeValues;for(const N in G){const O=G[N];if(O.location>=0){let b=F[N];if(b===void 0&&(N==="instanceMatrix"&&D.instanceMatrix&&(b=D.instanceMatrix),N==="instanceColor"&&D.instanceColor&&(b=D.instanceColor)),b!==void 0){const Q=b.normalized,te=b.itemSize,Oe=e.get(b);if(Oe===void 0)continue;const be=Oe.buffer,Ce=Oe.type,$=Oe.bytesPerElement,se=Ce===n.INT||Ce===n.UNSIGNED_INT||b.gpuType===L0;if(b.isInterleavedBufferAttribute){const re=b.data,Ae=re.stride,De=b.offset;if(re.isInstancedInterleavedBuffer){for(let ye=0;ye<O.locationSize;ye++)p(O.location+ye,re.meshPerAttribute);D.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=re.meshPerAttribute*re.count)}else for(let ye=0;ye<O.locationSize;ye++)g(O.location+ye);n.bindBuffer(n.ARRAY_BUFFER,be);for(let ye=0;ye<O.locationSize;ye++)S(O.location+ye,te/O.locationSize,Ce,Q,Ae*$,(De+te/O.locationSize*ye)*$,se)}else{if(b.isInstancedBufferAttribute){for(let re=0;re<O.locationSize;re++)p(O.location+re,b.meshPerAttribute);D.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=b.meshPerAttribute*b.count)}else for(let re=0;re<O.locationSize;re++)g(O.location+re);n.bindBuffer(n.ARRAY_BUFFER,be);for(let re=0;re<O.locationSize;re++)S(O.location+re,te/O.locationSize,Ce,Q,te*$,te/O.locationSize*re*$,se)}}else if(U!==void 0){const Q=U[N];if(Q!==void 0)switch(Q.length){case 2:n.vertexAttrib2fv(O.location,Q);break;case 3:n.vertexAttrib3fv(O.location,Q);break;case 4:n.vertexAttrib4fv(O.location,Q);break;default:n.vertexAttrib1fv(O.location,Q)}}}}v()}function E(){A();for(const D in i){const L=i[D];for(const z in L){const I=L[z];for(const F in I){const G=I[F];for(const U in G)c(G[U].object),delete G[U];delete I[F]}}delete i[D]}}function T(D){if(i[D.id]===void 0)return;const L=i[D.id];for(const z in L){const I=L[z];for(const F in I){const G=I[F];for(const U in G)c(G[U].object),delete G[U];delete I[F]}}delete i[D.id]}function w(D){for(const L in i){const z=i[L];for(const I in z){const F=z[I];if(F[D.id]===void 0)continue;const G=F[D.id];for(const U in G)c(G[U].object),delete G[U];delete F[D.id]}}}function y(D){for(const L in i){const z=i[L],I=D.isInstancedMesh===!0?D.id:0,F=z[I];if(F!==void 0){for(const G in F){const U=F[G];for(const N in U)c(U[N].object),delete U[N];delete F[G]}delete z[I],Object.keys(z).length===0&&delete i[L]}}}function A(){R(),a=!0,s!==r&&(s=r,u(s.object))}function R(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:A,resetDefaultState:R,dispose:E,releaseStatesOfGeometry:T,releaseStatesOfObject:y,releaseStatesOfProgram:w,initAttributes:_,enableAttribute:g,disableUnusedAttributes:v}}function Db(n,e,t){let i;function r(l){i=l}function s(l,u){n.drawArrays(i,l,u),t.update(u,i,1)}function a(l,u,c){c!==0&&(n.drawArraysInstanced(i,l,u,c),t.update(u,i,c))}function o(l,u,c){if(c===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,u,0,c);let f=0;for(let h=0;h<c;h++)f+=u[h];t.update(f,i,1)}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o}function Lb(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const w=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(w){return!(w!==gr&&i.convert(w)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(w){const y=w===gs&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(w!==Ji&&i.convert(w)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==Nr&&!y)}function l(w){if(w==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let u=t.precision!==void 0?t.precision:"highp";const c=l(u);c!==u&&($e("WebGLRenderer:",u,"not supported, using",c,"instead."),u=c);const d=t.logarithmicDepthBuffer===!0,f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&f===!1&&$e("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const h=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),m=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=n.getParameter(n.MAX_TEXTURE_SIZE),g=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),p=n.getParameter(n.MAX_VERTEX_ATTRIBS),v=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),S=n.getParameter(n.MAX_VARYING_VECTORS),x=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),E=n.getParameter(n.MAX_SAMPLES),T=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:u,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:h,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:v,maxVaryings:S,maxFragmentUniforms:x,maxSamples:E,samples:T}}function Nb(n){const e=this;let t=null,i=0,r=!1,s=!1;const a=new Ma,o=new Qe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,f){const h=d.length!==0||f||i!==0||r;return r=f,i=d.length,h},this.beginShadows=function(){s=!0,c(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,f){t=c(d,f,0)},this.setState=function(d,f,h){const m=d.clippingPlanes,_=d.clipIntersection,g=d.clipShadows,p=n.get(d);if(!r||m===null||m.length===0||s&&!g)s?c(null):u();else{const v=s?0:i,S=v*4;let x=p.clippingState||null;l.value=x,x=c(m,f,S,h);for(let E=0;E!==S;++E)x[E]=t[E];p.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=v}};function u(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function c(d,f,h,m){const _=d!==null?d.length:0;let g=null;if(_!==0){if(g=l.value,m!==!0||g===null){const p=h+_*4,v=f.matrixWorldInverse;o.getNormalMatrix(v),(g===null||g.length<p)&&(g=new Float32Array(p));for(let S=0,x=h;S!==_;++S,x+=4)a.copy(d[S]).applyMatrix4(v,o),a.normal.toArray(g,x),g[x+3]=a.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,g}}const zs=4,ax=[.125,.215,.35,.446,.526,.582],Ca=20,Ib=256,Gl=new H0,ox=new vt;let ip=null,rp=0,sp=0,ap=!1;const Ub=new Z;class lx{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,r=100,s={}){const{size:a=256,position:o=Ub}=s;ip=this._renderer.getRenderTarget(),rp=this._renderer.getActiveCubeFace(),sp=this._renderer.getActiveMipmapLevel(),ap=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,r,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=fx(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=cx(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(ip,rp,sp),this._renderer.xr.enabled=ap,e.scissorTest=!1,Mo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ka||e.mapping===ml?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ip=this._renderer.getRenderTarget(),rp=this._renderer.getActiveCubeFace(),sp=this._renderer.getActiveMipmapLevel(),ap=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Yn,minFilter:Yn,generateMipmaps:!1,type:gs,format:gr,colorSpace:md,depthBuffer:!1},r=ux(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ux(e,t,i);const{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Fb(s)),this._blurMaterial=kb(s,e,t),this._ggxMaterial=Ob(s,e,t)}return r}_compileMaterial(e){const t=new Wr(new Ss,e);this._renderer.compile(t,Gl)}_sceneToCubeUV(e,t,i,r,s){const l=new mr(90,1,t,i),u=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],d=this._renderer,f=d.autoClear,h=d.toneMapping;d.getClearColor(ox),d.toneMapping=Br,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(r),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Wr(new dc,new oM({name:"PMREM.Background",side:_i,depthWrite:!1,depthTest:!1})));const _=this._backgroundBox,g=_.material;let p=!1;const v=e.background;v?v.isColor&&(g.color.copy(v),e.background=null,p=!0):(g.color.copy(ox),p=!0);for(let S=0;S<6;S++){const x=S%3;x===0?(l.up.set(0,u[S],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+c[S],s.y,s.z)):x===1?(l.up.set(0,0,u[S]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+c[S],s.z)):(l.up.set(0,u[S],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+c[S]));const E=this._cubeSize;Mo(r,x*E,S>2?E:0,E,E),d.setRenderTarget(r),p&&d.render(_,l),d.render(e,l)}d.toneMapping=h,d.autoClear=f,e.background=v}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===Ka||e.mapping===ml;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=fx()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=cx());const s=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=s;const o=s.uniforms;o.envMap.value=e;const l=this._cubeSize;Mo(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(a,Gl)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodMeshes.length;for(let s=1;s<r;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=i}_applyGGXFilter(e,t,i){const r=this._renderer,s=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[i];o.material=a;const l=a.uniforms,u=i/(this._lodMeshes.length-1),c=t/(this._lodMeshes.length-1),d=Math.sqrt(u*u-c*c),f=0+u*1.25,h=d*f,{_lodMax:m}=this,_=this._sizeLods[i],g=3*_*(i>m-zs?i-m+zs:0),p=4*(this._cubeSize-_);l.envMap.value=e.texture,l.roughness.value=h,l.mipInt.value=m-t,Mo(s,g,p,3*_,2*_),r.setRenderTarget(s),r.render(o,Gl),l.envMap.value=s.texture,l.roughness.value=0,l.mipInt.value=m-i,Mo(e,g,p,3*_,2*_),r.setRenderTarget(e),r.render(o,Gl)}_blur(e,t,i,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,r,"latitudinal",s),this._halfBlur(a,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,a,o){const l=this._renderer,u=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&gt("blur direction must be either latitudinal or longitudinal!");const c=3,d=this._lodMeshes[r];d.material=u;const f=u.uniforms,h=this._sizeLods[i]-1,m=isFinite(s)?Math.PI/(2*h):2*Math.PI/(2*Ca-1),_=s/m,g=isFinite(s)?1+Math.floor(c*_):Ca;g>Ca&&$e(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Ca}`);const p=[];let v=0;for(let w=0;w<Ca;++w){const y=w/_,A=Math.exp(-y*y/2);p.push(A),w===0?v+=A:w<g&&(v+=2*A)}for(let w=0;w<p.length;w++)p[w]=p[w]/v;f.envMap.value=e.texture,f.samples.value=g,f.weights.value=p,f.latitudinal.value=a==="latitudinal",o&&(f.poleAxis.value=o);const{_lodMax:S}=this;f.dTheta.value=m,f.mipInt.value=S-i;const x=this._sizeLods[r],E=3*x*(r>S-zs?r-S+zs:0),T=4*(this._cubeSize-x);Mo(t,E,T,3*x,2*x),l.setRenderTarget(t),l.render(d,Gl)}}function Fb(n){const e=[],t=[],i=[];let r=n;const s=n-zs+1+ax.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);e.push(o);let l=1/o;a>n-zs?l=ax[a-n+zs-1]:a===0&&(l=0),t.push(l);const u=1/(o-2),c=-u,d=1+u,f=[c,c,d,c,d,d,c,c,d,d,c,d],h=6,m=6,_=3,g=2,p=1,v=new Float32Array(_*m*h),S=new Float32Array(g*m*h),x=new Float32Array(p*m*h);for(let T=0;T<h;T++){const w=T%3*2/3-1,y=T>2?0:-1,A=[w,y,0,w+2/3,y,0,w+2/3,y+1,0,w,y,0,w+2/3,y+1,0,w,y+1,0];v.set(A,_*m*T),S.set(f,g*m*T);const R=[T,T,T,T,T,T];x.set(R,p*m*T)}const E=new Ss;E.setAttribute("position",new Vr(v,_)),E.setAttribute("uv",new Vr(S,g)),E.setAttribute("faceIndex",new Vr(x,p)),i.push(new Wr(E,null)),r>zs&&r--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function ux(n,e,t){const i=new zr(n,e,t);return i.texture.mapping=$d,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Mo(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Ob(n,e,t){return new Sr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Ib,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Zd(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:ls,depthTest:!1,depthWrite:!1})}function kb(n,e,t){const i=new Float32Array(Ca),r=new Z(0,1,0);return new Sr({name:"SphericalGaussianBlur",defines:{n:Ca,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Zd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:ls,depthTest:!1,depthWrite:!1})}function cx(){return new Sr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Zd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ls,depthTest:!1,depthWrite:!1})}function fx(){return new Sr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Zd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ls,depthTest:!1,depthWrite:!1})}function Zd(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class mM extends zr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new uM(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new dc(5,5,5),s=new Sr({name:"CubemapFromEquirect",uniforms:_l(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:_i,blending:ls});s.uniforms.tEquirect.value=t;const a=new Wr(r,s),o=t.minFilter;return t.minFilter===Da&&(t.minFilter=Yn),new GC(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,i=!0,r=!0){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,r);e.setRenderTarget(s)}}function Bb(n){let e=new WeakMap,t=new WeakMap,i=null;function r(f,h=!1){return f==null?null:h?a(f):s(f)}function s(f){if(f&&f.isTexture){const h=f.mapping;if(h===Ph||h===Dh)if(e.has(f)){const m=e.get(f).texture;return o(m,f.mapping)}else{const m=f.image;if(m&&m.height>0){const _=new mM(m.height);return _.fromEquirectangularTexture(n,f),e.set(f,_),f.addEventListener("dispose",u),o(_.texture,f.mapping)}else return null}}return f}function a(f){if(f&&f.isTexture){const h=f.mapping,m=h===Ph||h===Dh,_=h===Ka||h===ml;if(m||_){let g=t.get(f);const p=g!==void 0?g.texture.pmremVersion:0;if(f.isRenderTargetTexture&&f.pmremVersion!==p)return i===null&&(i=new lx(n)),g=m?i.fromEquirectangular(f,g):i.fromCubemap(f,g),g.texture.pmremVersion=f.pmremVersion,t.set(f,g),g.texture;if(g!==void 0)return g.texture;{const v=f.image;return m&&v&&v.height>0||_&&v&&l(v)?(i===null&&(i=new lx(n)),g=m?i.fromEquirectangular(f):i.fromCubemap(f),g.texture.pmremVersion=f.pmremVersion,t.set(f,g),f.addEventListener("dispose",c),g.texture):null}}}return f}function o(f,h){return h===Ph?f.mapping=Ka:h===Dh&&(f.mapping=ml),f}function l(f){let h=0;const m=6;for(let _=0;_<m;_++)f[_]!==void 0&&h++;return h===m}function u(f){const h=f.target;h.removeEventListener("dispose",u);const m=e.get(h);m!==void 0&&(e.delete(h),m.dispose())}function c(f){const h=f.target;h.removeEventListener("dispose",c);const m=t.get(h);m!==void 0&&(t.delete(h),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:r,dispose:d}}function zb(n){const e={};function t(i){if(e[i]!==void 0)return e[i];const r=n.getExtension(i);return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&Qo("WebGLRenderer: "+i+" extension not supported."),r}}}function Vb(n,e,t,i){const r={},s=new WeakMap;function a(d){const f=d.target;f.index!==null&&e.remove(f.index);for(const m in f.attributes)e.remove(f.attributes[m]);f.removeEventListener("dispose",a),delete r[f.id];const h=s.get(f);h&&(e.remove(h),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function o(d,f){return r[f.id]===!0||(f.addEventListener("dispose",a),r[f.id]=!0,t.memory.geometries++),f}function l(d){const f=d.attributes;for(const h in f)e.update(f[h],n.ARRAY_BUFFER)}function u(d){const f=[],h=d.index,m=d.attributes.position;let _=0;if(m===void 0)return;if(h!==null){const v=h.array;_=h.version;for(let S=0,x=v.length;S<x;S+=3){const E=v[S+0],T=v[S+1],w=v[S+2];f.push(E,T,T,w,w,E)}}else{const v=m.array;_=m.version;for(let S=0,x=v.length/3-1;S<x;S+=3){const E=S+0,T=S+1,w=S+2;f.push(E,T,T,w,w,E)}}const g=new(m.count>=65535?aM:sM)(f,1);g.version=_;const p=s.get(d);p&&e.remove(p),s.set(d,g)}function c(d){const f=s.get(d);if(f){const h=d.index;h!==null&&f.version<h.version&&u(d)}else u(d);return s.get(d)}return{get:o,update:l,getWireframeAttribute:c}}function Hb(n,e,t){let i;function r(d){i=d}let s,a;function o(d){s=d.type,a=d.bytesPerElement}function l(d,f){n.drawElements(i,f,s,d*a),t.update(f,i,1)}function u(d,f,h){h!==0&&(n.drawElementsInstanced(i,f,s,d*a,h),t.update(f,i,h))}function c(d,f,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,f,0,s,d,0,h);let _=0;for(let g=0;g<h;g++)_+=f[g];t.update(_,i,1)}this.setMode=r,this.setIndex=o,this.render=l,this.renderInstances=u,this.renderMultiDraw=c}function Gb(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,o){switch(t.calls++,a){case n.TRIANGLES:t.triangles+=o*(s/3);break;case n.LINES:t.lines+=o*(s/2);break;case n.LINE_STRIP:t.lines+=o*(s-1);break;case n.LINE_LOOP:t.lines+=o*s;break;case n.POINTS:t.points+=o*s;break;default:gt("WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function Wb(n,e,t){const i=new WeakMap,r=new Zt;function s(a,o,l){const u=a.morphTargetInfluences,c=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=c!==void 0?c.length:0;let f=i.get(o);if(f===void 0||f.count!==d){let R=function(){y.dispose(),i.delete(o),o.removeEventListener("dispose",R)};var h=R;f!==void 0&&f.texture.dispose();const m=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,g=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],v=o.morphAttributes.normal||[],S=o.morphAttributes.color||[];let x=0;m===!0&&(x=1),_===!0&&(x=2),g===!0&&(x=3);let E=o.attributes.position.count*x,T=1;E>e.maxTextureSize&&(T=Math.ceil(E/e.maxTextureSize),E=e.maxTextureSize);const w=new Float32Array(E*T*4*d),y=new tM(w,E,T,d);y.type=Nr,y.needsUpdate=!0;const A=x*4;for(let D=0;D<d;D++){const L=p[D],z=v[D],I=S[D],F=E*T*4*D;for(let G=0;G<L.count;G++){const U=G*A;m===!0&&(r.fromBufferAttribute(L,G),w[F+U+0]=r.x,w[F+U+1]=r.y,w[F+U+2]=r.z,w[F+U+3]=0),_===!0&&(r.fromBufferAttribute(z,G),w[F+U+4]=r.x,w[F+U+5]=r.y,w[F+U+6]=r.z,w[F+U+7]=0),g===!0&&(r.fromBufferAttribute(I,G),w[F+U+8]=r.x,w[F+U+9]=r.y,w[F+U+10]=r.z,w[F+U+11]=I.itemSize===4?r.w:1)}}f={count:d,texture:y,size:new ht(E,T)},i.set(o,f),o.addEventListener("dispose",R)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",a.morphTexture,t);else{let m=0;for(let g=0;g<u.length;g++)m+=u[g];const _=o.morphTargetsRelative?1:1-m;l.getUniforms().setValue(n,"morphTargetBaseInfluence",_),l.getUniforms().setValue(n,"morphTargetInfluences",u)}l.getUniforms().setValue(n,"morphTargetsTexture",f.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",f.size)}return{update:s}}function Xb(n,e,t,i,r){let s=new WeakMap;function a(u){const c=r.render.frame,d=u.geometry,f=e.get(u,d);if(s.get(f)!==c&&(e.update(f),s.set(f,c)),u.isInstancedMesh&&(u.hasEventListener("dispose",l)===!1&&u.addEventListener("dispose",l),s.get(u)!==c&&(t.update(u.instanceMatrix,n.ARRAY_BUFFER),u.instanceColor!==null&&t.update(u.instanceColor,n.ARRAY_BUFFER),s.set(u,c))),u.isSkinnedMesh){const h=u.skeleton;s.get(h)!==c&&(h.update(),s.set(h,c))}return f}function o(){s=new WeakMap}function l(u){const c=u.target;c.removeEventListener("dispose",l),i.releaseStatesOfObject(c),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:a,dispose:o}}const Yb={[BS]:"LINEAR_TONE_MAPPING",[zS]:"REINHARD_TONE_MAPPING",[VS]:"CINEON_TONE_MAPPING",[HS]:"ACES_FILMIC_TONE_MAPPING",[WS]:"AGX_TONE_MAPPING",[XS]:"NEUTRAL_TONE_MAPPING",[GS]:"CUSTOM_TONE_MAPPING"};function qb(n,e,t,i,r,s){const a=new zr(e,t,{type:n,depthBuffer:r,stencilBuffer:s,samples:i?4:0,depthTexture:r?new gl(e,t):void 0}),o=new zr(e,t,{type:gs,depthBuffer:!1,stencilBuffer:!1}),l=new Ss;l.setAttribute("position",new cs([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new cs([0,2,0,0,2,0],2));const u=new zC({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),c=new Wr(l,u),d=new H0(-1,1,1,-1,0,1);let f=null,h=null,m=!1,_,g=null,p=[],v=!1;this.setSize=function(S,x){a.setSize(S,x),o.setSize(S,x);for(let E=0;E<p.length;E++){const T=p[E];T.setSize&&T.setSize(S,x)}},this.setEffects=function(S){p=S,v=p.length>0&&p[0].isRenderPass===!0;const x=a.width,E=a.height;for(let T=0;T<p.length;T++){const w=p[T];w.setSize&&w.setSize(x,E)}},this.begin=function(S,x){if(m||S.toneMapping===Br&&p.length===0)return!1;if(g=x,x!==null){const E=x.width,T=x.height;(a.width!==E||a.height!==T)&&this.setSize(E,T)}return v===!1&&S.setRenderTarget(a),_=S.toneMapping,S.toneMapping=Br,!0},this.hasRenderPass=function(){return v},this.end=function(S,x){S.toneMapping=_,m=!0;let E=a,T=o;for(let w=0;w<p.length;w++){const y=p[w];if(y.enabled!==!1&&(y.render(S,T,E,x),y.needsSwap!==!1)){const A=E;E=T,T=A}}if(f!==S.outputColorSpace||h!==S.toneMapping){f=S.outputColorSpace,h=S.toneMapping,u.defines={},ft.getTransfer(f)===Mt&&(u.defines.SRGB_TRANSFER="");const w=Yb[h];w&&(u.defines[w]=""),u.needsUpdate=!0}u.uniforms.tDiffuse.value=E.texture,S.setRenderTarget(g),S.render(c,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){a.depthTexture&&a.depthTexture.dispose(),a.dispose(),o.dispose(),l.dispose(),u.dispose()}}const gM=new ai,ug=new gl(1,1),_M=new tM,vM=new gC,xM=new uM,dx=[],hx=[],px=new Float32Array(16),mx=new Float32Array(9),gx=new Float32Array(4);function Rl(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=dx[r];if(s===void 0&&(s=new Float32Array(r),dx[r]=s),e!==0){i.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,n[a].toArray(s,o)}return s}function xn(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function yn(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function jd(n,e){let t=hx[e];t===void 0&&(t=new Int32Array(e),hx[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function $b(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Kb(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xn(t,e))return;n.uniform2fv(this.addr,e),yn(t,e)}}function Zb(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(xn(t,e))return;n.uniform3fv(this.addr,e),yn(t,e)}}function jb(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xn(t,e))return;n.uniform4fv(this.addr,e),yn(t,e)}}function Qb(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(xn(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),yn(t,e)}else{if(xn(t,i))return;gx.set(i),n.uniformMatrix2fv(this.addr,!1,gx),yn(t,i)}}function Jb(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(xn(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),yn(t,e)}else{if(xn(t,i))return;mx.set(i),n.uniformMatrix3fv(this.addr,!1,mx),yn(t,i)}}function e3(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(xn(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),yn(t,e)}else{if(xn(t,i))return;px.set(i),n.uniformMatrix4fv(this.addr,!1,px),yn(t,i)}}function t3(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function n3(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xn(t,e))return;n.uniform2iv(this.addr,e),yn(t,e)}}function i3(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xn(t,e))return;n.uniform3iv(this.addr,e),yn(t,e)}}function r3(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xn(t,e))return;n.uniform4iv(this.addr,e),yn(t,e)}}function s3(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function a3(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xn(t,e))return;n.uniform2uiv(this.addr,e),yn(t,e)}}function o3(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xn(t,e))return;n.uniform3uiv(this.addr,e),yn(t,e)}}function l3(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xn(t,e))return;n.uniform4uiv(this.addr,e),yn(t,e)}}function u3(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?(ug.compareFunction=t.isReversedDepthBuffer()?B0:k0,s=ug):s=gM,t.setTexture2D(e||s,r)}function c3(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||vM,r)}function f3(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||xM,r)}function d3(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||_M,r)}function h3(n){switch(n){case 5126:return $b;case 35664:return Kb;case 35665:return Zb;case 35666:return jb;case 35674:return Qb;case 35675:return Jb;case 35676:return e3;case 5124:case 35670:return t3;case 35667:case 35671:return n3;case 35668:case 35672:return i3;case 35669:case 35673:return r3;case 5125:return s3;case 36294:return a3;case 36295:return o3;case 36296:return l3;case 35678:case 36198:case 36298:case 36306:case 35682:return u3;case 35679:case 36299:case 36307:return c3;case 35680:case 36300:case 36308:case 36293:return f3;case 36289:case 36303:case 36311:case 36292:return d3}}function p3(n,e){n.uniform1fv(this.addr,e)}function m3(n,e){const t=Rl(e,this.size,2);n.uniform2fv(this.addr,t)}function g3(n,e){const t=Rl(e,this.size,3);n.uniform3fv(this.addr,t)}function _3(n,e){const t=Rl(e,this.size,4);n.uniform4fv(this.addr,t)}function v3(n,e){const t=Rl(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function x3(n,e){const t=Rl(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function y3(n,e){const t=Rl(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function S3(n,e){n.uniform1iv(this.addr,e)}function M3(n,e){n.uniform2iv(this.addr,e)}function E3(n,e){n.uniform3iv(this.addr,e)}function T3(n,e){n.uniform4iv(this.addr,e)}function w3(n,e){n.uniform1uiv(this.addr,e)}function A3(n,e){n.uniform2uiv(this.addr,e)}function C3(n,e){n.uniform3uiv(this.addr,e)}function R3(n,e){n.uniform4uiv(this.addr,e)}function b3(n,e,t){const i=this.cache,r=e.length,s=jd(t,r);xn(i,s)||(n.uniform1iv(this.addr,s),yn(i,s));let a;this.type===n.SAMPLER_2D_SHADOW?a=ug:a=gM;for(let o=0;o!==r;++o)t.setTexture2D(e[o]||a,s[o])}function P3(n,e,t){const i=this.cache,r=e.length,s=jd(t,r);xn(i,s)||(n.uniform1iv(this.addr,s),yn(i,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||vM,s[a])}function D3(n,e,t){const i=this.cache,r=e.length,s=jd(t,r);xn(i,s)||(n.uniform1iv(this.addr,s),yn(i,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||xM,s[a])}function L3(n,e,t){const i=this.cache,r=e.length,s=jd(t,r);xn(i,s)||(n.uniform1iv(this.addr,s),yn(i,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||_M,s[a])}function N3(n){switch(n){case 5126:return p3;case 35664:return m3;case 35665:return g3;case 35666:return _3;case 35674:return v3;case 35675:return x3;case 35676:return y3;case 5124:case 35670:return S3;case 35667:case 35671:return M3;case 35668:case 35672:return E3;case 35669:case 35673:return T3;case 5125:return w3;case 36294:return A3;case 36295:return C3;case 36296:return R3;case 35678:case 36198:case 36298:case 36306:case 35682:return b3;case 35679:case 36299:case 36307:return P3;case 35680:case 36300:case 36308:case 36293:return D3;case 36289:case 36303:case 36311:case 36292:return L3}}class I3{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=h3(t.type)}}class U3{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=N3(t.type)}}class F3{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],i)}}}const op=/(\w+)(\])?(\[|\.)?/g;function _x(n,e){n.seq.push(e),n.map[e.id]=e}function O3(n,e,t){const i=n.name,r=i.length;for(op.lastIndex=0;;){const s=op.exec(i),a=op.lastIndex;let o=s[1];const l=s[2]==="]",u=s[3];if(l&&(o=o|0),u===void 0||u==="["&&a+2===r){_x(t,u===void 0?new I3(o,n,e):new U3(o,n,e));break}else{let d=t.map[o];d===void 0&&(d=new F3(o),_x(t,d)),t=d}}}class Nf{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){const o=e.getActiveUniform(t,a),l=e.getUniformLocation(t,o.name);O3(o,l,this)}const r=[],s=[];for(const a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(a):s.push(a);r.length>0&&(this.seq=r.concat(s))}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&i.push(a)}return i}}function vx(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const k3=37297;let B3=0;function z3(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}const xx=new Qe;function V3(n){ft._getMatrix(xx,ft.workingColorSpace,n);const e=`mat3( ${xx.elements.map(t=>t.toFixed(4))} )`;switch(ft.getTransfer(n)){case gd:return[e,"LinearTransferOETF"];case Mt:return[e,"sRGBTransferOETF"];default:return $e("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function yx(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),s=(n.getShaderInfoLog(e)||"").trim();if(i&&s==="")return"";const a=/ERROR: 0:(\d+)/.exec(s);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+z3(n.getShaderSource(e),o)}else return s}function H3(n,e){const t=V3(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const G3={[BS]:"Linear",[zS]:"Reinhard",[VS]:"Cineon",[HS]:"ACESFilmic",[WS]:"AgX",[XS]:"Neutral",[GS]:"Custom"};function W3(n,e){const t=G3[e];return t===void 0?($e("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const tf=new Z;function X3(){ft.getLuminanceCoefficients(tf);const n=tf.x.toFixed(4),e=tf.y.toFixed(4),t=tf.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Y3(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Jl).join(`
`)}function q3(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function $3(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),a=s.name;let o=1;s.type===n.FLOAT_MAT2&&(o=2),s.type===n.FLOAT_MAT3&&(o=3),s.type===n.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:n.getAttribLocation(e,a),locationSize:o}}return t}function Jl(n){return n!==""}function Sx(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Mx(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const K3=/^[ \t]*#include +<([\w\d./]+)>/gm;function cg(n){return n.replace(K3,j3)}const Z3=new Map;function j3(n,e){let t=tt[e];if(t===void 0){const i=Z3.get(e);if(i!==void 0)t=tt[i],$e('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return cg(t)}const Q3=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ex(n){return n.replace(Q3,J3)}function J3(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Tx(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const eP={[Rf]:"SHADOWMAP_TYPE_PCF",[Ql]:"SHADOWMAP_TYPE_VSM"};function tP(n){return eP[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const nP={[Ka]:"ENVMAP_TYPE_CUBE",[ml]:"ENVMAP_TYPE_CUBE",[$d]:"ENVMAP_TYPE_CUBE_UV"};function iP(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":nP[n.envMapMode]||"ENVMAP_TYPE_CUBE"}const rP={[ml]:"ENVMAP_MODE_REFRACTION"};function sP(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":rP[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}const aP={[kS]:"ENVMAP_BLENDING_MULTIPLY",[KA]:"ENVMAP_BLENDING_MIX",[ZA]:"ENVMAP_BLENDING_ADD"};function oP(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":aP[n.combine]||"ENVMAP_BLENDING_NONE"}function lP(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function uP(n,e,t,i){const r=n.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=tP(t),u=iP(t),c=sP(t),d=oP(t),f=lP(t),h=Y3(t),m=q3(s),_=r.createProgram();let g,p,v=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Jl).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Jl).join(`
`),p.length>0&&(p+=`
`)):(g=[Tx(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Jl).join(`
`),p=[Tx(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.envMap?"#define "+c:"",t.envMap?"#define "+d:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Br?"#define TONE_MAPPING":"",t.toneMapping!==Br?tt.tonemapping_pars_fragment:"",t.toneMapping!==Br?W3("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",tt.colorspace_pars_fragment,H3("linearToOutputTexel",t.outputColorSpace),X3(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Jl).join(`
`)),a=cg(a),a=Sx(a,t),a=Mx(a,t),o=cg(o),o=Sx(o,t),o=Mx(o,t),a=Ex(a),o=Ex(o),t.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[h,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===kv?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===kv?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const S=v+g+a,x=v+p+o,E=vx(r,r.VERTEX_SHADER,S),T=vx(r,r.FRAGMENT_SHADER,x);r.attachShader(_,E),r.attachShader(_,T),t.index0AttributeName!==void 0?r.bindAttribLocation(_,0,t.index0AttributeName):t.hasPositionAttribute===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function w(D){if(n.debug.checkShaderErrors){const L=r.getProgramInfoLog(_)||"",z=r.getShaderInfoLog(E)||"",I=r.getShaderInfoLog(T)||"",F=L.trim(),G=z.trim(),U=I.trim();let N=!0,O=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(N=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,_,E,T);else{const b=yx(r,E,"vertex"),Q=yx(r,T,"fragment");gt("WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+F+`
`+b+`
`+Q)}else F!==""?$e("WebGLProgram: Program Info Log:",F):(G===""||U==="")&&(O=!1);O&&(D.diagnostics={runnable:N,programLog:F,vertexShader:{log:G,prefix:g},fragmentShader:{log:U,prefix:p}})}r.deleteShader(E),r.deleteShader(T),y=new Nf(r,_),A=$3(r,_)}let y;this.getUniforms=function(){return y===void 0&&w(this),y};let A;this.getAttributes=function(){return A===void 0&&w(this),A};let R=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=r.getProgramParameter(_,k3)),R},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=B3++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=E,this.fragmentShader=T,this}let cP=0;class fP{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,i){const r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(i)===!1&&(r.add(i),i.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new dP(e),t.set(e,i)),i}}class dP{constructor(e){this.id=cP++,this.code=e,this.usedTimes=0}}function hP(n){return n===Za||n===hd||n===pd}function pP(n,e,t,i,r,s){const a=new iM,o=new fP,l=new Set,u=[],c=new Map,d=i.logarithmicDepthBuffer;let f=i.precision;const h={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(y){return l.add(y),y===0?"uv":`uv${y}`}function _(y,A,R,D,L,z){const I=D.fog,F=L.geometry,G=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?D.environment:null,U=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,N=e.get(y.envMap||G,U),O=N&&N.mapping===$d?N.image.height:null,b=h[y.type];y.precision!==null&&(f=i.getMaxPrecision(y.precision),f!==y.precision&&$e("WebGLProgram.getParameters:",y.precision,"not supported, using",f,"instead."));const Q=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,te=Q!==void 0?Q.length:0;let Oe=0;F.morphAttributes.position!==void 0&&(Oe=1),F.morphAttributes.normal!==void 0&&(Oe=2),F.morphAttributes.color!==void 0&&(Oe=3);let be,Ce,$,se;if(b){const oe=Pr[b];be=oe.vertexShader,Ce=oe.fragmentShader}else{be=y.vertexShader,Ce=y.fragmentShader;const oe=o.getVertexShaderStage(y),We=o.getFragmentShaderStage(y);o.update(y,oe,We),$=oe.id,se=We.id}const re=n.getRenderTarget(),Ae=n.state.buffers.depth.getReversed(),De=L.isInstancedMesh===!0,ye=L.isBatchedMesh===!0,je=!!y.map,me=!!y.matcap,Re=!!N,Ne=!!y.aoMap,ke=!!y.lightMap,W=!!y.bumpMap&&y.wireframe===!1,et=!!y.normalMap,ut=!!y.displacementMap,Pt=!!y.emissiveMap,Ke=!!y.metalnessMap,xt=!!y.roughnessMap,B=y.anisotropy>0,Yt=y.clearcoat>0,qe=y.dispersion>0,P=y.iridescence>0,M=y.sheen>0,H=y.transmission>0,Y=B&&!!y.anisotropyMap,J=Yt&&!!y.clearcoatMap,he=Yt&&!!y.clearcoatNormalMap,ce=Yt&&!!y.clearcoatRoughnessMap,ee=P&&!!y.iridescenceMap,ne=P&&!!y.iridescenceThicknessMap,_e=M&&!!y.sheenColorMap,Ue=M&&!!y.sheenRoughnessMap,ve=!!y.specularMap,ge=!!y.specularColorMap,de=!!y.specularIntensityMap,ze=H&&!!y.transmissionMap,Ge=H&&!!y.thicknessMap,k=!!y.gradientMap,pe=!!y.alphaMap,ie=y.alphaTest>0,xe=!!y.alphaHash,Se=!!y.extensions;let ae=Br;y.toneMapped&&(re===null||re.isXRRenderTarget===!0)&&(ae=n.toneMapping);const le={shaderID:b,shaderType:y.type,shaderName:y.name,vertexShader:be,fragmentShader:Ce,defines:y.defines,customVertexShaderID:$,customFragmentShaderID:se,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:f,batching:ye,batchingColor:ye&&L._colorsTexture!==null,instancing:De,instancingColor:De&&L.instanceColor!==null,instancingMorph:De&&L.morphTexture!==null,outputColorSpace:re===null?n.outputColorSpace:re.isXRRenderTarget===!0?re.texture.colorSpace:ft.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:je,matcap:me,envMap:Re,envMapMode:Re&&N.mapping,envMapCubeUVHeight:O,aoMap:Ne,lightMap:ke,bumpMap:W,normalMap:et,displacementMap:ut,emissiveMap:Pt,normalMapObjectSpace:et&&y.normalMapType===JA,normalMapTangentSpace:et&&y.normalMapType===Uv,packedNormalMap:et&&y.normalMapType===Uv&&hP(y.normalMap.format),metalnessMap:Ke,roughnessMap:xt,anisotropy:B,anisotropyMap:Y,clearcoat:Yt,clearcoatMap:J,clearcoatNormalMap:he,clearcoatRoughnessMap:ce,dispersion:qe,iridescence:P,iridescenceMap:ee,iridescenceThicknessMap:ne,sheen:M,sheenColorMap:_e,sheenRoughnessMap:Ue,specularMap:ve,specularColorMap:ge,specularIntensityMap:de,transmission:H,transmissionMap:ze,thicknessMap:Ge,gradientMap:k,opaque:y.transparent===!1&&y.blending===jo&&y.alphaToCoverage===!1,alphaMap:pe,alphaTest:ie,alphaHash:xe,combine:y.combine,mapUv:je&&m(y.map.channel),aoMapUv:Ne&&m(y.aoMap.channel),lightMapUv:ke&&m(y.lightMap.channel),bumpMapUv:W&&m(y.bumpMap.channel),normalMapUv:et&&m(y.normalMap.channel),displacementMapUv:ut&&m(y.displacementMap.channel),emissiveMapUv:Pt&&m(y.emissiveMap.channel),metalnessMapUv:Ke&&m(y.metalnessMap.channel),roughnessMapUv:xt&&m(y.roughnessMap.channel),anisotropyMapUv:Y&&m(y.anisotropyMap.channel),clearcoatMapUv:J&&m(y.clearcoatMap.channel),clearcoatNormalMapUv:he&&m(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ce&&m(y.clearcoatRoughnessMap.channel),iridescenceMapUv:ee&&m(y.iridescenceMap.channel),iridescenceThicknessMapUv:ne&&m(y.iridescenceThicknessMap.channel),sheenColorMapUv:_e&&m(y.sheenColorMap.channel),sheenRoughnessMapUv:Ue&&m(y.sheenRoughnessMap.channel),specularMapUv:ve&&m(y.specularMap.channel),specularColorMapUv:ge&&m(y.specularColorMap.channel),specularIntensityMapUv:de&&m(y.specularIntensityMap.channel),transmissionMapUv:ze&&m(y.transmissionMap.channel),thicknessMapUv:Ge&&m(y.thicknessMap.channel),alphaMapUv:pe&&m(y.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(et||B),vertexNormals:!!F.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:L.isPoints===!0&&!!F.attributes.uv&&(je||pe),fog:!!I,useFog:y.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||F.attributes.normal===void 0&&et===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Ae,skinning:L.isSkinnedMesh===!0,hasPositionAttribute:F.attributes.position!==void 0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:te,morphTextureStride:Oe,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numLightProbeGrids:z.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:y.dithering,shadowMapEnabled:n.shadowMap.enabled&&R.length>0,shadowMapType:n.shadowMap.type,toneMapping:ae,decodeVideoTexture:je&&y.map.isVideoTexture===!0&&ft.getTransfer(y.map.colorSpace)===Mt,decodeVideoTextureEmissive:Pt&&y.emissiveMap.isVideoTexture===!0&&ft.getTransfer(y.emissiveMap.colorSpace)===Mt,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===ts,flipSided:y.side===_i,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:Se&&y.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Se&&y.extensions.multiDraw===!0||ye)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return le.vertexUv1s=l.has(1),le.vertexUv2s=l.has(2),le.vertexUv3s=l.has(3),l.clear(),le}function g(y){const A=[];if(y.shaderID?A.push(y.shaderID):(A.push(y.customVertexShaderID),A.push(y.customFragmentShaderID)),y.defines!==void 0)for(const R in y.defines)A.push(R),A.push(y.defines[R]);return y.isRawShaderMaterial===!1&&(p(A,y),v(A,y),A.push(n.outputColorSpace)),A.push(y.customProgramCacheKey),A.join()}function p(y,A){y.push(A.precision),y.push(A.outputColorSpace),y.push(A.envMapMode),y.push(A.envMapCubeUVHeight),y.push(A.mapUv),y.push(A.alphaMapUv),y.push(A.lightMapUv),y.push(A.aoMapUv),y.push(A.bumpMapUv),y.push(A.normalMapUv),y.push(A.displacementMapUv),y.push(A.emissiveMapUv),y.push(A.metalnessMapUv),y.push(A.roughnessMapUv),y.push(A.anisotropyMapUv),y.push(A.clearcoatMapUv),y.push(A.clearcoatNormalMapUv),y.push(A.clearcoatRoughnessMapUv),y.push(A.iridescenceMapUv),y.push(A.iridescenceThicknessMapUv),y.push(A.sheenColorMapUv),y.push(A.sheenRoughnessMapUv),y.push(A.specularMapUv),y.push(A.specularColorMapUv),y.push(A.specularIntensityMapUv),y.push(A.transmissionMapUv),y.push(A.thicknessMapUv),y.push(A.combine),y.push(A.fogExp2),y.push(A.sizeAttenuation),y.push(A.morphTargetsCount),y.push(A.morphAttributeCount),y.push(A.numDirLights),y.push(A.numPointLights),y.push(A.numSpotLights),y.push(A.numSpotLightMaps),y.push(A.numHemiLights),y.push(A.numRectAreaLights),y.push(A.numDirLightShadows),y.push(A.numPointLightShadows),y.push(A.numSpotLightShadows),y.push(A.numSpotLightShadowsWithMaps),y.push(A.numLightProbes),y.push(A.shadowMapType),y.push(A.toneMapping),y.push(A.numClippingPlanes),y.push(A.numClipIntersection),y.push(A.depthPacking)}function v(y,A){a.disableAll(),A.instancing&&a.enable(0),A.instancingColor&&a.enable(1),A.instancingMorph&&a.enable(2),A.matcap&&a.enable(3),A.envMap&&a.enable(4),A.normalMapObjectSpace&&a.enable(5),A.normalMapTangentSpace&&a.enable(6),A.clearcoat&&a.enable(7),A.iridescence&&a.enable(8),A.alphaTest&&a.enable(9),A.vertexColors&&a.enable(10),A.vertexAlphas&&a.enable(11),A.vertexUv1s&&a.enable(12),A.vertexUv2s&&a.enable(13),A.vertexUv3s&&a.enable(14),A.vertexTangents&&a.enable(15),A.anisotropy&&a.enable(16),A.alphaHash&&a.enable(17),A.batching&&a.enable(18),A.dispersion&&a.enable(19),A.batchingColor&&a.enable(20),A.gradientMap&&a.enable(21),A.packedNormalMap&&a.enable(22),A.vertexNormals&&a.enable(23),y.push(a.mask),a.disableAll(),A.fog&&a.enable(0),A.useFog&&a.enable(1),A.flatShading&&a.enable(2),A.logarithmicDepthBuffer&&a.enable(3),A.reversedDepthBuffer&&a.enable(4),A.skinning&&a.enable(5),A.morphTargets&&a.enable(6),A.morphNormals&&a.enable(7),A.morphColors&&a.enable(8),A.premultipliedAlpha&&a.enable(9),A.shadowMapEnabled&&a.enable(10),A.doubleSided&&a.enable(11),A.flipSided&&a.enable(12),A.useDepthPacking&&a.enable(13),A.dithering&&a.enable(14),A.transmission&&a.enable(15),A.sheen&&a.enable(16),A.opaque&&a.enable(17),A.pointsUvs&&a.enable(18),A.decodeVideoTexture&&a.enable(19),A.decodeVideoTextureEmissive&&a.enable(20),A.alphaToCoverage&&a.enable(21),A.numLightProbeGrids>0&&a.enable(22),A.hasPositionAttribute&&a.enable(23),y.push(a.mask)}function S(y){const A=h[y.type];let R;if(A){const D=Pr[A];R=OC.clone(D.uniforms)}else R=y.uniforms;return R}function x(y,A){let R=c.get(A);return R!==void 0?++R.usedTimes:(R=new uP(n,A,y,r),u.push(R),c.set(A,R)),R}function E(y){if(--y.usedTimes===0){const A=u.indexOf(y);u[A]=u[u.length-1],u.pop(),c.delete(y.cacheKey),y.destroy()}}function T(y){o.remove(y)}function w(){o.dispose()}return{getParameters:_,getProgramCacheKey:g,getUniforms:S,acquireProgram:x,releaseProgram:E,releaseShaderCache:T,programs:u,dispose:w}}function mP(){let n=new WeakMap;function e(a){return n.has(a)}function t(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function r(a,o,l){n.get(a)[o]=l}function s(){n=new WeakMap}return{has:e,get:t,remove:i,update:r,dispose:s}}function gP(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function wx(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Ax(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function a(f){let h=0;return f.isInstancedMesh&&(h+=2),f.isSkinnedMesh&&(h+=1),h}function o(f,h,m,_,g,p){let v=n[e];return v===void 0?(v={id:f.id,object:f,geometry:h,material:m,materialVariant:a(f),groupOrder:_,renderOrder:f.renderOrder,z:g,group:p},n[e]=v):(v.id=f.id,v.object=f,v.geometry=h,v.material=m,v.materialVariant=a(f),v.groupOrder=_,v.renderOrder=f.renderOrder,v.z=g,v.group=p),e++,v}function l(f,h,m,_,g,p){const v=o(f,h,m,_,g,p);m.transmission>0?i.push(v):m.transparent===!0?r.push(v):t.push(v)}function u(f,h,m,_,g,p){const v=o(f,h,m,_,g,p);m.transmission>0?i.unshift(v):m.transparent===!0?r.unshift(v):t.unshift(v)}function c(f,h,m){t.length>1&&t.sort(f||gP),i.length>1&&i.sort(h||wx),r.length>1&&r.sort(h||wx),m&&(t.reverse(),i.reverse(),r.reverse())}function d(){for(let f=e,h=n.length;f<h;f++){const m=n[f];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:l,unshift:u,finish:d,sort:c}}function _P(){let n=new WeakMap;function e(i,r){const s=n.get(i);let a;return s===void 0?(a=new Ax,n.set(i,[a])):r>=s.length?(a=new Ax,s.push(a)):a=s[r],a}function t(){n=new WeakMap}return{get:e,dispose:t}}function vP(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new Z,color:new vt};break;case"SpotLight":t={position:new Z,direction:new Z,color:new vt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new Z,color:new vt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new Z,skyColor:new vt,groundColor:new vt};break;case"RectAreaLight":t={color:new vt,position:new Z,halfWidth:new Z,halfHeight:new Z};break}return n[e.id]=t,t}}}function xP(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let yP=0;function SP(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function MP(n){const e=new vP,t=xP(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let u=0;u<9;u++)i.probe.push(new Z);const r=new Z,s=new hn,a=new hn;function o(u){let c=0,d=0,f=0;for(let A=0;A<9;A++)i.probe[A].set(0,0,0);let h=0,m=0,_=0,g=0,p=0,v=0,S=0,x=0,E=0,T=0,w=0;u.sort(SP);for(let A=0,R=u.length;A<R;A++){const D=u[A],L=D.color,z=D.intensity,I=D.distance;let F=null;if(D.shadow&&D.shadow.map&&(D.shadow.map.texture.format===Za?F=D.shadow.map.texture:F=D.shadow.map.depthTexture||D.shadow.map.texture),D.isAmbientLight)c+=L.r*z,d+=L.g*z,f+=L.b*z;else if(D.isLightProbe){for(let G=0;G<9;G++)i.probe[G].addScaledVector(D.sh.coefficients[G],z);w++}else if(D.isDirectionalLight){const G=e.get(D);if(G.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){const U=D.shadow,N=t.get(D);N.shadowIntensity=U.intensity,N.shadowBias=U.bias,N.shadowNormalBias=U.normalBias,N.shadowRadius=U.radius,N.shadowMapSize=U.mapSize,i.directionalShadow[h]=N,i.directionalShadowMap[h]=F,i.directionalShadowMatrix[h]=D.shadow.matrix,v++}i.directional[h]=G,h++}else if(D.isSpotLight){const G=e.get(D);G.position.setFromMatrixPosition(D.matrixWorld),G.color.copy(L).multiplyScalar(z),G.distance=I,G.coneCos=Math.cos(D.angle),G.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),G.decay=D.decay,i.spot[_]=G;const U=D.shadow;if(D.map&&(i.spotLightMap[E]=D.map,E++,U.updateMatrices(D),D.castShadow&&T++),i.spotLightMatrix[_]=U.matrix,D.castShadow){const N=t.get(D);N.shadowIntensity=U.intensity,N.shadowBias=U.bias,N.shadowNormalBias=U.normalBias,N.shadowRadius=U.radius,N.shadowMapSize=U.mapSize,i.spotShadow[_]=N,i.spotShadowMap[_]=F,x++}_++}else if(D.isRectAreaLight){const G=e.get(D);G.color.copy(L).multiplyScalar(z),G.halfWidth.set(D.width*.5,0,0),G.halfHeight.set(0,D.height*.5,0),i.rectArea[g]=G,g++}else if(D.isPointLight){const G=e.get(D);if(G.color.copy(D.color).multiplyScalar(D.intensity),G.distance=D.distance,G.decay=D.decay,D.castShadow){const U=D.shadow,N=t.get(D);N.shadowIntensity=U.intensity,N.shadowBias=U.bias,N.shadowNormalBias=U.normalBias,N.shadowRadius=U.radius,N.shadowMapSize=U.mapSize,N.shadowCameraNear=U.camera.near,N.shadowCameraFar=U.camera.far,i.pointShadow[m]=N,i.pointShadowMap[m]=F,i.pointShadowMatrix[m]=D.shadow.matrix,S++}i.point[m]=G,m++}else if(D.isHemisphereLight){const G=e.get(D);G.skyColor.copy(D.color).multiplyScalar(z),G.groundColor.copy(D.groundColor).multiplyScalar(z),i.hemi[p]=G,p++}}g>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Te.LTC_FLOAT_1,i.rectAreaLTC2=Te.LTC_FLOAT_2):(i.rectAreaLTC1=Te.LTC_HALF_1,i.rectAreaLTC2=Te.LTC_HALF_2)),i.ambient[0]=c,i.ambient[1]=d,i.ambient[2]=f;const y=i.hash;(y.directionalLength!==h||y.pointLength!==m||y.spotLength!==_||y.rectAreaLength!==g||y.hemiLength!==p||y.numDirectionalShadows!==v||y.numPointShadows!==S||y.numSpotShadows!==x||y.numSpotMaps!==E||y.numLightProbes!==w)&&(i.directional.length=h,i.spot.length=_,i.rectArea.length=g,i.point.length=m,i.hemi.length=p,i.directionalShadow.length=v,i.directionalShadowMap.length=v,i.pointShadow.length=S,i.pointShadowMap.length=S,i.spotShadow.length=x,i.spotShadowMap.length=x,i.directionalShadowMatrix.length=v,i.pointShadowMatrix.length=S,i.spotLightMatrix.length=x+E-T,i.spotLightMap.length=E,i.numSpotLightShadowsWithMaps=T,i.numLightProbes=w,y.directionalLength=h,y.pointLength=m,y.spotLength=_,y.rectAreaLength=g,y.hemiLength=p,y.numDirectionalShadows=v,y.numPointShadows=S,y.numSpotShadows=x,y.numSpotMaps=E,y.numLightProbes=w,i.version=yP++)}function l(u,c){let d=0,f=0,h=0,m=0,_=0;const g=c.matrixWorldInverse;for(let p=0,v=u.length;p<v;p++){const S=u[p];if(S.isDirectionalLight){const x=i.directional[d];x.direction.setFromMatrixPosition(S.matrixWorld),r.setFromMatrixPosition(S.target.matrixWorld),x.direction.sub(r),x.direction.transformDirection(g),d++}else if(S.isSpotLight){const x=i.spot[h];x.position.setFromMatrixPosition(S.matrixWorld),x.position.applyMatrix4(g),x.direction.setFromMatrixPosition(S.matrixWorld),r.setFromMatrixPosition(S.target.matrixWorld),x.direction.sub(r),x.direction.transformDirection(g),h++}else if(S.isRectAreaLight){const x=i.rectArea[m];x.position.setFromMatrixPosition(S.matrixWorld),x.position.applyMatrix4(g),a.identity(),s.copy(S.matrixWorld),s.premultiply(g),a.extractRotation(s),x.halfWidth.set(S.width*.5,0,0),x.halfHeight.set(0,S.height*.5,0),x.halfWidth.applyMatrix4(a),x.halfHeight.applyMatrix4(a),m++}else if(S.isPointLight){const x=i.point[f];x.position.setFromMatrixPosition(S.matrixWorld),x.position.applyMatrix4(g),f++}else if(S.isHemisphereLight){const x=i.hemi[_];x.direction.setFromMatrixPosition(S.matrixWorld),x.direction.transformDirection(g),_++}}}return{setup:o,setupView:l,state:i}}function Cx(n){const e=new MP(n),t=[],i=[],r=[];function s(f){d.camera=f,t.length=0,i.length=0,r.length=0}function a(f){t.push(f)}function o(f){i.push(f)}function l(f){r.push(f)}function u(){e.setup(t)}function c(f){e.setupView(t,f)}const d={lightsArray:t,shadowsArray:i,lightProbeGridArray:r,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:d,setupLights:u,setupLightsView:c,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function EP(n){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new Cx(n),e.set(r,[o])):s>=a.length?(o=new Cx(n),a.push(o)):o=a[s],o}function i(){e=new WeakMap}return{get:t,dispose:i}}const TP=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,wP=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,AP=[new Z(1,0,0),new Z(-1,0,0),new Z(0,1,0),new Z(0,-1,0),new Z(0,0,1),new Z(0,0,-1)],CP=[new Z(0,-1,0),new Z(0,-1,0),new Z(0,0,1),new Z(0,0,-1),new Z(0,-1,0),new Z(0,-1,0)],Rx=new hn,Wl=new Z,lp=new Z;function RP(n,e,t){let i=new lM;const r=new ht,s=new ht,a=new Zt,o=new VC,l=new HC,u={},c=t.maxTextureSize,d={[sa]:_i,[_i]:sa,[ts]:ts},f=new Sr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ht},radius:{value:4}},vertexShader:TP,fragmentShader:wP}),h=f.clone();h.defines.HORIZONTAL_PASS=1;const m=new Ss;m.setAttribute("position",new Vr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new Wr(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Rf;let p=this.type;this.render=function(T,w,y){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||T.length===0)return;this.type===PA&&($e("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Rf);const A=n.getRenderTarget(),R=n.getActiveCubeFace(),D=n.getActiveMipmapLevel(),L=n.state;L.setBlending(ls),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);const z=p!==this.type;z&&w.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(F=>F.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,F=T.length;I<F;I++){const G=T[I],U=G.shadow;if(U===void 0){$e("WebGLShadowMap:",G,"has no shadow.");continue}if(U.autoUpdate===!1&&U.needsUpdate===!1)continue;r.copy(U.mapSize);const N=U.getFrameExtents();r.multiply(N),s.copy(U.mapSize),(r.x>c||r.y>c)&&(r.x>c&&(s.x=Math.floor(c/N.x),r.x=s.x*N.x,U.mapSize.x=s.x),r.y>c&&(s.y=Math.floor(c/N.y),r.y=s.y*N.y,U.mapSize.y=s.y));const O=n.state.buffers.depth.getReversed();if(U.camera._reversedDepth=O,U.map===null||z===!0){if(U.map!==null&&(U.map.depthTexture!==null&&(U.map.depthTexture.dispose(),U.map.depthTexture=null),U.map.dispose()),this.type===Ql){if(G.isPointLight){$e("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}U.map=new zr(r.x,r.y,{format:Za,type:gs,minFilter:Yn,magFilter:Yn,generateMipmaps:!1}),U.map.texture.name=G.name+".shadowMap",U.map.depthTexture=new gl(r.x,r.y,Nr),U.map.depthTexture.name=G.name+".shadowMapDepth",U.map.depthTexture.format=_s,U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=Pn,U.map.depthTexture.magFilter=Pn}else G.isPointLight?(U.map=new mM(r.x),U.map.depthTexture=new UC(r.x,Gr)):(U.map=new zr(r.x,r.y),U.map.depthTexture=new gl(r.x,r.y,Gr)),U.map.depthTexture.name=G.name+".shadowMap",U.map.depthTexture.format=_s,this.type===Rf?(U.map.depthTexture.compareFunction=O?B0:k0,U.map.depthTexture.minFilter=Yn,U.map.depthTexture.magFilter=Yn):(U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=Pn,U.map.depthTexture.magFilter=Pn);U.camera.updateProjectionMatrix()}const b=U.map.isWebGLCubeRenderTarget?6:1;for(let Q=0;Q<b;Q++){if(U.map.isWebGLCubeRenderTarget)n.setRenderTarget(U.map,Q),n.clear();else{Q===0&&(n.setRenderTarget(U.map),n.clear());const te=U.getViewport(Q);a.set(s.x*te.x,s.y*te.y,s.x*te.z,s.y*te.w),L.viewport(a)}if(G.isPointLight){const te=U.camera,Oe=U.matrix,be=G.distance||te.far;be!==te.far&&(te.far=be,te.updateProjectionMatrix()),Wl.setFromMatrixPosition(G.matrixWorld),te.position.copy(Wl),lp.copy(te.position),lp.add(AP[Q]),te.up.copy(CP[Q]),te.lookAt(lp),te.updateMatrixWorld(),Oe.makeTranslation(-Wl.x,-Wl.y,-Wl.z),Rx.multiplyMatrices(te.projectionMatrix,te.matrixWorldInverse),U._frustum.setFromProjectionMatrix(Rx,te.coordinateSystem,te.reversedDepth)}else U.updateMatrices(G);i=U.getFrustum(),x(w,y,U.camera,G,this.type)}U.isPointLightShadow!==!0&&this.type===Ql&&v(U,y),U.needsUpdate=!1}p=this.type,g.needsUpdate=!1,n.setRenderTarget(A,R,D)};function v(T,w){const y=e.update(_);f.defines.VSM_SAMPLES!==T.blurSamples&&(f.defines.VSM_SAMPLES=T.blurSamples,h.defines.VSM_SAMPLES=T.blurSamples,f.needsUpdate=!0,h.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new zr(r.x,r.y,{format:Za,type:gs})),f.uniforms.shadow_pass.value=T.map.depthTexture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,n.setRenderTarget(T.mapPass),n.clear(),n.renderBufferDirect(w,null,y,f,_,null),h.uniforms.shadow_pass.value=T.mapPass.texture,h.uniforms.resolution.value=T.mapSize,h.uniforms.radius.value=T.radius,n.setRenderTarget(T.map),n.clear(),n.renderBufferDirect(w,null,y,h,_,null)}function S(T,w,y,A){let R=null;const D=y.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(D!==void 0)R=D;else if(R=y.isPointLight===!0?l:o,n.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){const L=R.uuid,z=w.uuid;let I=u[L];I===void 0&&(I={},u[L]=I);let F=I[z];F===void 0&&(F=R.clone(),I[z]=F,w.addEventListener("dispose",E)),R=F}if(R.visible=w.visible,R.wireframe=w.wireframe,A===Ql?R.side=w.shadowSide!==null?w.shadowSide:w.side:R.side=w.shadowSide!==null?w.shadowSide:d[w.side],R.alphaMap=w.alphaMap,R.alphaTest=w.alphaToCoverage===!0?.5:w.alphaTest,R.map=w.map,R.clipShadows=w.clipShadows,R.clippingPlanes=w.clippingPlanes,R.clipIntersection=w.clipIntersection,R.displacementMap=w.displacementMap,R.displacementScale=w.displacementScale,R.displacementBias=w.displacementBias,R.wireframeLinewidth=w.wireframeLinewidth,R.linewidth=w.linewidth,y.isPointLight===!0&&R.isMeshDistanceMaterial===!0){const L=n.properties.get(R);L.light=y}return R}function x(T,w,y,A,R){if(T.visible===!1)return;if(T.layers.test(w.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&R===Ql)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,T.matrixWorld);const z=e.update(T),I=T.material;if(Array.isArray(I)){const F=z.groups;for(let G=0,U=F.length;G<U;G++){const N=F[G],O=I[N.materialIndex];if(O&&O.visible){const b=S(T,O,A,R);T.onBeforeShadow(n,T,w,y,z,b,N),n.renderBufferDirect(y,null,z,b,T,N),T.onAfterShadow(n,T,w,y,z,b,N)}}}else if(I.visible){const F=S(T,I,A,R);T.onBeforeShadow(n,T,w,y,z,F,null),n.renderBufferDirect(y,null,z,F,T,null),T.onAfterShadow(n,T,w,y,z,F,null)}}const L=T.children;for(let z=0,I=L.length;z<I;z++)x(L[z],w,y,A,R)}function E(T){T.target.removeEventListener("dispose",E);for(const y in u){const A=u[y],R=T.target.uuid;R in A&&(A[R].dispose(),delete A[R])}}}function bP(n,e){function t(){let k=!1;const pe=new Zt;let ie=null;const xe=new Zt(0,0,0,0);return{setMask:function(Se){ie!==Se&&!k&&(n.colorMask(Se,Se,Se,Se),ie=Se)},setLocked:function(Se){k=Se},setClear:function(Se,ae,le,oe,We){We===!0&&(Se*=oe,ae*=oe,le*=oe),pe.set(Se,ae,le,oe),xe.equals(pe)===!1&&(n.clearColor(Se,ae,le,oe),xe.copy(pe))},reset:function(){k=!1,ie=null,xe.set(-1,0,0,0)}}}function i(){let k=!1,pe=!1,ie=null,xe=null,Se=null;return{setReversed:function(ae){if(pe!==ae){const le=e.get("EXT_clip_control");ae?le.clipControlEXT(le.LOWER_LEFT_EXT,le.ZERO_TO_ONE_EXT):le.clipControlEXT(le.LOWER_LEFT_EXT,le.NEGATIVE_ONE_TO_ONE_EXT),pe=ae;const oe=Se;Se=null,this.setClear(oe)}},getReversed:function(){return pe},setTest:function(ae){ae?re(n.DEPTH_TEST):Ae(n.DEPTH_TEST)},setMask:function(ae){ie!==ae&&!k&&(n.depthMask(ae),ie=ae)},setFunc:function(ae){if(pe&&(ae=uC[ae]),xe!==ae){switch(ae){case Em:n.depthFunc(n.NEVER);break;case Tm:n.depthFunc(n.ALWAYS);break;case wm:n.depthFunc(n.LESS);break;case pl:n.depthFunc(n.LEQUAL);break;case Am:n.depthFunc(n.EQUAL);break;case Cm:n.depthFunc(n.GEQUAL);break;case Rm:n.depthFunc(n.GREATER);break;case bm:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}xe=ae}},setLocked:function(ae){k=ae},setClear:function(ae){Se!==ae&&(Se=ae,pe&&(ae=1-ae),n.clearDepth(ae))},reset:function(){k=!1,ie=null,xe=null,Se=null,pe=!1}}}function r(){let k=!1,pe=null,ie=null,xe=null,Se=null,ae=null,le=null,oe=null,We=null;return{setTest:function(ue){k||(ue?re(n.STENCIL_TEST):Ae(n.STENCIL_TEST))},setMask:function(ue){pe!==ue&&!k&&(n.stencilMask(ue),pe=ue)},setFunc:function(ue,Xe,Fe){(ie!==ue||xe!==Xe||Se!==Fe)&&(n.stencilFunc(ue,Xe,Fe),ie=ue,xe=Xe,Se=Fe)},setOp:function(ue,Xe,Fe){(ae!==ue||le!==Xe||oe!==Fe)&&(n.stencilOp(ue,Xe,Fe),ae=ue,le=Xe,oe=Fe)},setLocked:function(ue){k=ue},setClear:function(ue){We!==ue&&(n.clearStencil(ue),We=ue)},reset:function(){k=!1,pe=null,ie=null,xe=null,Se=null,ae=null,le=null,oe=null,We=null}}}const s=new t,a=new i,o=new r,l=new WeakMap,u=new WeakMap;let c={},d={},f={},h=new WeakMap,m=[],_=null,g=!1,p=null,v=null,S=null,x=null,E=null,T=null,w=null,y=new vt(0,0,0),A=0,R=!1,D=null,L=null,z=null,I=null,F=null;const G=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let U=!1,N=0;const O=n.getParameter(n.VERSION);O.indexOf("WebGL")!==-1?(N=parseFloat(/^WebGL (\d)/.exec(O)[1]),U=N>=1):O.indexOf("OpenGL ES")!==-1&&(N=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),U=N>=2);let b=null,Q={};const te=n.getParameter(n.SCISSOR_BOX),Oe=n.getParameter(n.VIEWPORT),be=new Zt().fromArray(te),Ce=new Zt().fromArray(Oe);function $(k,pe,ie,xe){const Se=new Uint8Array(4),ae=n.createTexture();n.bindTexture(k,ae),n.texParameteri(k,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(k,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let le=0;le<ie;le++)k===n.TEXTURE_3D||k===n.TEXTURE_2D_ARRAY?n.texImage3D(pe,0,n.RGBA,1,1,xe,0,n.RGBA,n.UNSIGNED_BYTE,Se):n.texImage2D(pe+le,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Se);return ae}const se={};se[n.TEXTURE_2D]=$(n.TEXTURE_2D,n.TEXTURE_2D,1),se[n.TEXTURE_CUBE_MAP]=$(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),se[n.TEXTURE_2D_ARRAY]=$(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),se[n.TEXTURE_3D]=$(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),re(n.DEPTH_TEST),a.setFunc(pl),W(!1),et(Dv),re(n.CULL_FACE),Ne(ls);function re(k){c[k]!==!0&&(n.enable(k),c[k]=!0)}function Ae(k){c[k]!==!1&&(n.disable(k),c[k]=!1)}function De(k,pe){return f[k]!==pe?(n.bindFramebuffer(k,pe),f[k]=pe,k===n.DRAW_FRAMEBUFFER&&(f[n.FRAMEBUFFER]=pe),k===n.FRAMEBUFFER&&(f[n.DRAW_FRAMEBUFFER]=pe),!0):!1}function ye(k,pe){let ie=m,xe=!1;if(k){ie=h.get(pe),ie===void 0&&(ie=[],h.set(pe,ie));const Se=k.textures;if(ie.length!==Se.length||ie[0]!==n.COLOR_ATTACHMENT0){for(let ae=0,le=Se.length;ae<le;ae++)ie[ae]=n.COLOR_ATTACHMENT0+ae;ie.length=Se.length,xe=!0}}else ie[0]!==n.BACK&&(ie[0]=n.BACK,xe=!0);xe&&n.drawBuffers(ie)}function je(k){return _!==k?(n.useProgram(k),_=k,!0):!1}const me={[Aa]:n.FUNC_ADD,[LA]:n.FUNC_SUBTRACT,[NA]:n.FUNC_REVERSE_SUBTRACT};me[IA]=n.MIN,me[UA]=n.MAX;const Re={[FA]:n.ZERO,[OA]:n.ONE,[kA]:n.SRC_COLOR,[Sm]:n.SRC_ALPHA,[WA]:n.SRC_ALPHA_SATURATE,[HA]:n.DST_COLOR,[zA]:n.DST_ALPHA,[BA]:n.ONE_MINUS_SRC_COLOR,[Mm]:n.ONE_MINUS_SRC_ALPHA,[GA]:n.ONE_MINUS_DST_COLOR,[VA]:n.ONE_MINUS_DST_ALPHA,[XA]:n.CONSTANT_COLOR,[YA]:n.ONE_MINUS_CONSTANT_COLOR,[qA]:n.CONSTANT_ALPHA,[$A]:n.ONE_MINUS_CONSTANT_ALPHA};function Ne(k,pe,ie,xe,Se,ae,le,oe,We,ue){if(k===ls){g===!0&&(Ae(n.BLEND),g=!1);return}if(g===!1&&(re(n.BLEND),g=!0),k!==DA){if(k!==p||ue!==R){if((v!==Aa||E!==Aa)&&(n.blendEquation(n.FUNC_ADD),v=Aa,E=Aa),ue)switch(k){case jo:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Lv:n.blendFunc(n.ONE,n.ONE);break;case Nv:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Iv:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:gt("WebGLState: Invalid blending: ",k);break}else switch(k){case jo:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Lv:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Nv:gt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Iv:gt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:gt("WebGLState: Invalid blending: ",k);break}S=null,x=null,T=null,w=null,y.set(0,0,0),A=0,p=k,R=ue}return}Se=Se||pe,ae=ae||ie,le=le||xe,(pe!==v||Se!==E)&&(n.blendEquationSeparate(me[pe],me[Se]),v=pe,E=Se),(ie!==S||xe!==x||ae!==T||le!==w)&&(n.blendFuncSeparate(Re[ie],Re[xe],Re[ae],Re[le]),S=ie,x=xe,T=ae,w=le),(oe.equals(y)===!1||We!==A)&&(n.blendColor(oe.r,oe.g,oe.b,We),y.copy(oe),A=We),p=k,R=!1}function ke(k,pe){k.side===ts?Ae(n.CULL_FACE):re(n.CULL_FACE);let ie=k.side===_i;pe&&(ie=!ie),W(ie),k.blending===jo&&k.transparent===!1?Ne(ls):Ne(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),a.setFunc(k.depthFunc),a.setTest(k.depthTest),a.setMask(k.depthWrite),s.setMask(k.colorWrite);const xe=k.stencilWrite;o.setTest(xe),xe&&(o.setMask(k.stencilWriteMask),o.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),o.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),Pt(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?re(n.SAMPLE_ALPHA_TO_COVERAGE):Ae(n.SAMPLE_ALPHA_TO_COVERAGE)}function W(k){D!==k&&(k?n.frontFace(n.CW):n.frontFace(n.CCW),D=k)}function et(k){k!==RA?(re(n.CULL_FACE),k!==L&&(k===Dv?n.cullFace(n.BACK):k===bA?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Ae(n.CULL_FACE),L=k}function ut(k){k!==z&&(U&&n.lineWidth(k),z=k)}function Pt(k,pe,ie){k?(re(n.POLYGON_OFFSET_FILL),(I!==pe||F!==ie)&&(I=pe,F=ie,a.getReversed()&&(pe=-pe),n.polygonOffset(pe,ie))):Ae(n.POLYGON_OFFSET_FILL)}function Ke(k){k?re(n.SCISSOR_TEST):Ae(n.SCISSOR_TEST)}function xt(k){k===void 0&&(k=n.TEXTURE0+G-1),b!==k&&(n.activeTexture(k),b=k)}function B(k,pe,ie){ie===void 0&&(b===null?ie=n.TEXTURE0+G-1:ie=b);let xe=Q[ie];xe===void 0&&(xe={type:void 0,texture:void 0},Q[ie]=xe),(xe.type!==k||xe.texture!==pe)&&(b!==ie&&(n.activeTexture(ie),b=ie),n.bindTexture(k,pe||se[k]),xe.type=k,xe.texture=pe)}function Yt(){const k=Q[b];k!==void 0&&k.type!==void 0&&(n.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function qe(){try{n.compressedTexImage2D(...arguments)}catch(k){gt("WebGLState:",k)}}function P(){try{n.compressedTexImage3D(...arguments)}catch(k){gt("WebGLState:",k)}}function M(){try{n.texSubImage2D(...arguments)}catch(k){gt("WebGLState:",k)}}function H(){try{n.texSubImage3D(...arguments)}catch(k){gt("WebGLState:",k)}}function Y(){try{n.compressedTexSubImage2D(...arguments)}catch(k){gt("WebGLState:",k)}}function J(){try{n.compressedTexSubImage3D(...arguments)}catch(k){gt("WebGLState:",k)}}function he(){try{n.texStorage2D(...arguments)}catch(k){gt("WebGLState:",k)}}function ce(){try{n.texStorage3D(...arguments)}catch(k){gt("WebGLState:",k)}}function ee(){try{n.texImage2D(...arguments)}catch(k){gt("WebGLState:",k)}}function ne(){try{n.texImage3D(...arguments)}catch(k){gt("WebGLState:",k)}}function _e(k){return d[k]!==void 0?d[k]:n.getParameter(k)}function Ue(k,pe){d[k]!==pe&&(n.pixelStorei(k,pe),d[k]=pe)}function ve(k){be.equals(k)===!1&&(n.scissor(k.x,k.y,k.z,k.w),be.copy(k))}function ge(k){Ce.equals(k)===!1&&(n.viewport(k.x,k.y,k.z,k.w),Ce.copy(k))}function de(k,pe){let ie=u.get(pe);ie===void 0&&(ie=new WeakMap,u.set(pe,ie));let xe=ie.get(k);xe===void 0&&(xe=n.getUniformBlockIndex(pe,k.name),ie.set(k,xe))}function ze(k,pe){const xe=u.get(pe).get(k);l.get(pe)!==xe&&(n.uniformBlockBinding(pe,xe,k.__bindingPointIndex),l.set(pe,xe))}function Ge(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),c={},d={},b=null,Q={},f={},h=new WeakMap,m=[],_=null,g=!1,p=null,v=null,S=null,x=null,E=null,T=null,w=null,y=new vt(0,0,0),A=0,R=!1,D=null,L=null,z=null,I=null,F=null,be.set(0,0,n.canvas.width,n.canvas.height),Ce.set(0,0,n.canvas.width,n.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:re,disable:Ae,bindFramebuffer:De,drawBuffers:ye,useProgram:je,setBlending:Ne,setMaterial:ke,setFlipSided:W,setCullFace:et,setLineWidth:ut,setPolygonOffset:Pt,setScissorTest:Ke,activeTexture:xt,bindTexture:B,unbindTexture:Yt,compressedTexImage2D:qe,compressedTexImage3D:P,texImage2D:ee,texImage3D:ne,pixelStorei:Ue,getParameter:_e,updateUBOMapping:de,uniformBlockBinding:ze,texStorage2D:he,texStorage3D:ce,texSubImage2D:M,texSubImage3D:H,compressedTexSubImage2D:Y,compressedTexSubImage3D:J,scissor:ve,viewport:ge,reset:Ge}}function PP(n,e,t,i,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),u=new ht,c=new WeakMap,d=new Set;let f;const h=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(P,M){return m?new OffscreenCanvas(P,M):vd("canvas")}function g(P,M,H){let Y=1;const J=qe(P);if((J.width>H||J.height>H)&&(Y=H/Math.max(J.width,J.height)),Y<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const he=Math.floor(Y*J.width),ce=Math.floor(Y*J.height);f===void 0&&(f=_(he,ce));const ee=M?_(he,ce):f;return ee.width=he,ee.height=ce,ee.getContext("2d").drawImage(P,0,0,he,ce),$e("WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+he+"x"+ce+")."),ee}else return"data"in P&&$e("WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),P;return P}function p(P){return P.generateMipmaps}function v(P){n.generateMipmap(P)}function S(P){return P.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?n.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function x(P,M,H,Y,J,he=!1){if(P!==null){if(n[P]!==void 0)return n[P];$e("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let ce;Y&&(ce=e.get("EXT_texture_norm16"),ce||$e("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ee=M;if(M===n.RED&&(H===n.FLOAT&&(ee=n.R32F),H===n.HALF_FLOAT&&(ee=n.R16F),H===n.UNSIGNED_BYTE&&(ee=n.R8),H===n.UNSIGNED_SHORT&&ce&&(ee=ce.R16_EXT),H===n.SHORT&&ce&&(ee=ce.R16_SNORM_EXT)),M===n.RED_INTEGER&&(H===n.UNSIGNED_BYTE&&(ee=n.R8UI),H===n.UNSIGNED_SHORT&&(ee=n.R16UI),H===n.UNSIGNED_INT&&(ee=n.R32UI),H===n.BYTE&&(ee=n.R8I),H===n.SHORT&&(ee=n.R16I),H===n.INT&&(ee=n.R32I)),M===n.RG&&(H===n.FLOAT&&(ee=n.RG32F),H===n.HALF_FLOAT&&(ee=n.RG16F),H===n.UNSIGNED_BYTE&&(ee=n.RG8),H===n.UNSIGNED_SHORT&&ce&&(ee=ce.RG16_EXT),H===n.SHORT&&ce&&(ee=ce.RG16_SNORM_EXT)),M===n.RG_INTEGER&&(H===n.UNSIGNED_BYTE&&(ee=n.RG8UI),H===n.UNSIGNED_SHORT&&(ee=n.RG16UI),H===n.UNSIGNED_INT&&(ee=n.RG32UI),H===n.BYTE&&(ee=n.RG8I),H===n.SHORT&&(ee=n.RG16I),H===n.INT&&(ee=n.RG32I)),M===n.RGB_INTEGER&&(H===n.UNSIGNED_BYTE&&(ee=n.RGB8UI),H===n.UNSIGNED_SHORT&&(ee=n.RGB16UI),H===n.UNSIGNED_INT&&(ee=n.RGB32UI),H===n.BYTE&&(ee=n.RGB8I),H===n.SHORT&&(ee=n.RGB16I),H===n.INT&&(ee=n.RGB32I)),M===n.RGBA_INTEGER&&(H===n.UNSIGNED_BYTE&&(ee=n.RGBA8UI),H===n.UNSIGNED_SHORT&&(ee=n.RGBA16UI),H===n.UNSIGNED_INT&&(ee=n.RGBA32UI),H===n.BYTE&&(ee=n.RGBA8I),H===n.SHORT&&(ee=n.RGBA16I),H===n.INT&&(ee=n.RGBA32I)),M===n.RGB&&(H===n.UNSIGNED_SHORT&&ce&&(ee=ce.RGB16_EXT),H===n.SHORT&&ce&&(ee=ce.RGB16_SNORM_EXT),H===n.UNSIGNED_INT_5_9_9_9_REV&&(ee=n.RGB9_E5),H===n.UNSIGNED_INT_10F_11F_11F_REV&&(ee=n.R11F_G11F_B10F)),M===n.RGBA){const ne=he?gd:ft.getTransfer(J);H===n.FLOAT&&(ee=n.RGBA32F),H===n.HALF_FLOAT&&(ee=n.RGBA16F),H===n.UNSIGNED_BYTE&&(ee=ne===Mt?n.SRGB8_ALPHA8:n.RGBA8),H===n.UNSIGNED_SHORT&&ce&&(ee=ce.RGBA16_EXT),H===n.SHORT&&ce&&(ee=ce.RGBA16_SNORM_EXT),H===n.UNSIGNED_SHORT_4_4_4_4&&(ee=n.RGBA4),H===n.UNSIGNED_SHORT_5_5_5_1&&(ee=n.RGB5_A1)}return(ee===n.R16F||ee===n.R32F||ee===n.RG16F||ee===n.RG32F||ee===n.RGBA16F||ee===n.RGBA32F)&&e.get("EXT_color_buffer_float"),ee}function E(P,M){let H;return P?M===null||M===Gr||M===qu?H=n.DEPTH24_STENCIL8:M===Nr?H=n.DEPTH32F_STENCIL8:M===Yu&&(H=n.DEPTH24_STENCIL8,$e("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Gr||M===qu?H=n.DEPTH_COMPONENT24:M===Nr?H=n.DEPTH_COMPONENT32F:M===Yu&&(H=n.DEPTH_COMPONENT16),H}function T(P,M){return p(P)===!0||P.isFramebufferTexture&&P.minFilter!==Pn&&P.minFilter!==Yn?Math.log2(Math.max(M.width,M.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?M.mipmaps.length:1}function w(P){const M=P.target;M.removeEventListener("dispose",w),A(M),M.isVideoTexture&&c.delete(M),M.isHTMLTexture&&d.delete(M)}function y(P){const M=P.target;M.removeEventListener("dispose",y),D(M)}function A(P){const M=i.get(P);if(M.__webglInit===void 0)return;const H=P.source,Y=h.get(H);if(Y){const J=Y[M.__cacheKey];J.usedTimes--,J.usedTimes===0&&R(P),Object.keys(Y).length===0&&h.delete(H)}i.remove(P)}function R(P){const M=i.get(P);n.deleteTexture(M.__webglTexture);const H=P.source,Y=h.get(H);delete Y[M.__cacheKey],a.memory.textures--}function D(P){const M=i.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),i.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let Y=0;Y<6;Y++){if(Array.isArray(M.__webglFramebuffer[Y]))for(let J=0;J<M.__webglFramebuffer[Y].length;J++)n.deleteFramebuffer(M.__webglFramebuffer[Y][J]);else n.deleteFramebuffer(M.__webglFramebuffer[Y]);M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer[Y])}else{if(Array.isArray(M.__webglFramebuffer))for(let Y=0;Y<M.__webglFramebuffer.length;Y++)n.deleteFramebuffer(M.__webglFramebuffer[Y]);else n.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&n.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let Y=0;Y<M.__webglColorRenderbuffer.length;Y++)M.__webglColorRenderbuffer[Y]&&n.deleteRenderbuffer(M.__webglColorRenderbuffer[Y]);M.__webglDepthRenderbuffer&&n.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const H=P.textures;for(let Y=0,J=H.length;Y<J;Y++){const he=i.get(H[Y]);he.__webglTexture&&(n.deleteTexture(he.__webglTexture),a.memory.textures--),i.remove(H[Y])}i.remove(P)}let L=0;function z(){L=0}function I(){return L}function F(P){L=P}function G(){const P=L;return P>=r.maxTextures&&$e("WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+r.maxTextures),L+=1,P}function U(P){const M=[];return M.push(P.wrapS),M.push(P.wrapT),M.push(P.wrapR||0),M.push(P.magFilter),M.push(P.minFilter),M.push(P.anisotropy),M.push(P.internalFormat),M.push(P.format),M.push(P.type),M.push(P.generateMipmaps),M.push(P.premultiplyAlpha),M.push(P.flipY),M.push(P.unpackAlignment),M.push(P.colorSpace),M.join()}function N(P,M){const H=i.get(P);if(P.isVideoTexture&&B(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&H.__version!==P.version){const Y=P.image;if(Y===null)$e("WebGLRenderer: Texture marked for update but no image data found.");else if(Y.complete===!1)$e("WebGLRenderer: Texture marked for update but image is incomplete");else{Ae(H,P,M);return}}else P.isExternalTexture&&(H.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,H.__webglTexture,n.TEXTURE0+M)}function O(P,M){const H=i.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){Ae(H,P,M);return}else P.isExternalTexture&&(H.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,H.__webglTexture,n.TEXTURE0+M)}function b(P,M){const H=i.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){Ae(H,P,M);return}t.bindTexture(n.TEXTURE_3D,H.__webglTexture,n.TEXTURE0+M)}function Q(P,M){const H=i.get(P);if(P.isCubeDepthTexture!==!0&&P.version>0&&H.__version!==P.version){De(H,P,M);return}t.bindTexture(n.TEXTURE_CUBE_MAP,H.__webglTexture,n.TEXTURE0+M)}const te={[Pm]:n.REPEAT,[ss]:n.CLAMP_TO_EDGE,[Dm]:n.MIRRORED_REPEAT},Oe={[Pn]:n.NEAREST,[jA]:n.NEAREST_MIPMAP_NEAREST,[Nc]:n.NEAREST_MIPMAP_LINEAR,[Yn]:n.LINEAR,[Lh]:n.LINEAR_MIPMAP_NEAREST,[Da]:n.LINEAR_MIPMAP_LINEAR},be={[eC]:n.NEVER,[sC]:n.ALWAYS,[tC]:n.LESS,[k0]:n.LEQUAL,[nC]:n.EQUAL,[B0]:n.GEQUAL,[iC]:n.GREATER,[rC]:n.NOTEQUAL};function Ce(P,M){if(M.type===Nr&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===Yn||M.magFilter===Lh||M.magFilter===Nc||M.magFilter===Da||M.minFilter===Yn||M.minFilter===Lh||M.minFilter===Nc||M.minFilter===Da)&&$e("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(P,n.TEXTURE_WRAP_S,te[M.wrapS]),n.texParameteri(P,n.TEXTURE_WRAP_T,te[M.wrapT]),(P===n.TEXTURE_3D||P===n.TEXTURE_2D_ARRAY)&&n.texParameteri(P,n.TEXTURE_WRAP_R,te[M.wrapR]),n.texParameteri(P,n.TEXTURE_MAG_FILTER,Oe[M.magFilter]),n.texParameteri(P,n.TEXTURE_MIN_FILTER,Oe[M.minFilter]),M.compareFunction&&(n.texParameteri(P,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(P,n.TEXTURE_COMPARE_FUNC,be[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===Pn||M.minFilter!==Nc&&M.minFilter!==Da||M.type===Nr&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||i.get(M).__currentAnisotropy){const H=e.get("EXT_texture_filter_anisotropic");n.texParameterf(P,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,r.getMaxAnisotropy())),i.get(M).__currentAnisotropy=M.anisotropy}}}function $(P,M){let H=!1;P.__webglInit===void 0&&(P.__webglInit=!0,M.addEventListener("dispose",w));const Y=M.source;let J=h.get(Y);J===void 0&&(J={},h.set(Y,J));const he=U(M);if(he!==P.__cacheKey){J[he]===void 0&&(J[he]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,H=!0),J[he].usedTimes++;const ce=J[P.__cacheKey];ce!==void 0&&(J[P.__cacheKey].usedTimes--,ce.usedTimes===0&&R(M)),P.__cacheKey=he,P.__webglTexture=J[he].texture}return H}function se(P,M,H){return Math.floor(Math.floor(P/H)/M)}function re(P,M,H,Y){const he=P.updateRanges;if(he.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,M.width,M.height,H,Y,M.data);else{he.sort((Ue,ve)=>Ue.start-ve.start);let ce=0;for(let Ue=1;Ue<he.length;Ue++){const ve=he[ce],ge=he[Ue],de=ve.start+ve.count,ze=se(ge.start,M.width,4),Ge=se(ve.start,M.width,4);ge.start<=de+1&&ze===Ge&&se(ge.start+ge.count-1,M.width,4)===ze?ve.count=Math.max(ve.count,ge.start+ge.count-ve.start):(++ce,he[ce]=ge)}he.length=ce+1;const ee=t.getParameter(n.UNPACK_ROW_LENGTH),ne=t.getParameter(n.UNPACK_SKIP_PIXELS),_e=t.getParameter(n.UNPACK_SKIP_ROWS);t.pixelStorei(n.UNPACK_ROW_LENGTH,M.width);for(let Ue=0,ve=he.length;Ue<ve;Ue++){const ge=he[Ue],de=Math.floor(ge.start/4),ze=Math.ceil(ge.count/4),Ge=de%M.width,k=Math.floor(de/M.width),pe=ze,ie=1;t.pixelStorei(n.UNPACK_SKIP_PIXELS,Ge),t.pixelStorei(n.UNPACK_SKIP_ROWS,k),t.texSubImage2D(n.TEXTURE_2D,0,Ge,k,pe,ie,H,Y,M.data)}P.clearUpdateRanges(),t.pixelStorei(n.UNPACK_ROW_LENGTH,ee),t.pixelStorei(n.UNPACK_SKIP_PIXELS,ne),t.pixelStorei(n.UNPACK_SKIP_ROWS,_e)}}function Ae(P,M,H){let Y=n.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(Y=n.TEXTURE_2D_ARRAY),M.isData3DTexture&&(Y=n.TEXTURE_3D);const J=$(P,M),he=M.source;t.bindTexture(Y,P.__webglTexture,n.TEXTURE0+H);const ce=i.get(he);if(he.version!==ce.__version||J===!0){if(t.activeTexture(n.TEXTURE0+H),(typeof ImageBitmap<"u"&&M.image instanceof ImageBitmap)===!1){const ie=ft.getPrimaries(ft.workingColorSpace),xe=M.colorSpace===Os?null:ft.getPrimaries(M.colorSpace),Se=M.colorSpace===Os||ie===xe?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se)}t.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment);let ne=g(M.image,!1,r.maxTextureSize);ne=Yt(M,ne);const _e=s.convert(M.format,M.colorSpace),Ue=s.convert(M.type);let ve=x(M.internalFormat,_e,Ue,M.normalized,M.colorSpace,M.isVideoTexture);Ce(Y,M);let ge;const de=M.mipmaps,ze=M.isVideoTexture!==!0,Ge=ce.__version===void 0||J===!0,k=he.dataReady,pe=T(M,ne);if(M.isDepthTexture)ve=E(M.format===La,M.type),Ge&&(ze?t.texStorage2D(n.TEXTURE_2D,1,ve,ne.width,ne.height):t.texImage2D(n.TEXTURE_2D,0,ve,ne.width,ne.height,0,_e,Ue,null));else if(M.isDataTexture)if(de.length>0){ze&&Ge&&t.texStorage2D(n.TEXTURE_2D,pe,ve,de[0].width,de[0].height);for(let ie=0,xe=de.length;ie<xe;ie++)ge=de[ie],ze?k&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,ge.width,ge.height,_e,Ue,ge.data):t.texImage2D(n.TEXTURE_2D,ie,ve,ge.width,ge.height,0,_e,Ue,ge.data);M.generateMipmaps=!1}else ze?(Ge&&t.texStorage2D(n.TEXTURE_2D,pe,ve,ne.width,ne.height),k&&re(M,ne,_e,Ue)):t.texImage2D(n.TEXTURE_2D,0,ve,ne.width,ne.height,0,_e,Ue,ne.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){ze&&Ge&&t.texStorage3D(n.TEXTURE_2D_ARRAY,pe,ve,de[0].width,de[0].height,ne.depth);for(let ie=0,xe=de.length;ie<xe;ie++)if(ge=de[ie],M.format!==gr)if(_e!==null)if(ze){if(k)if(M.layerUpdates.size>0){const Se=sx(ge.width,ge.height,M.format,M.type);for(const ae of M.layerUpdates){const le=ge.data.subarray(ae*Se/ge.data.BYTES_PER_ELEMENT,(ae+1)*Se/ge.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,ae,ge.width,ge.height,1,_e,le)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,0,ge.width,ge.height,ne.depth,_e,ge.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ie,ve,ge.width,ge.height,ne.depth,0,ge.data,0,0);else $e("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ze?k&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,0,ge.width,ge.height,ne.depth,_e,Ue,ge.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ie,ve,ge.width,ge.height,ne.depth,0,_e,Ue,ge.data)}else{ze&&Ge&&t.texStorage2D(n.TEXTURE_2D,pe,ve,de[0].width,de[0].height);for(let ie=0,xe=de.length;ie<xe;ie++)ge=de[ie],M.format!==gr?_e!==null?ze?k&&t.compressedTexSubImage2D(n.TEXTURE_2D,ie,0,0,ge.width,ge.height,_e,ge.data):t.compressedTexImage2D(n.TEXTURE_2D,ie,ve,ge.width,ge.height,0,ge.data):$e("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ze?k&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,ge.width,ge.height,_e,Ue,ge.data):t.texImage2D(n.TEXTURE_2D,ie,ve,ge.width,ge.height,0,_e,Ue,ge.data)}else if(M.isDataArrayTexture)if(ze){if(Ge&&t.texStorage3D(n.TEXTURE_2D_ARRAY,pe,ve,ne.width,ne.height,ne.depth),k)if(M.layerUpdates.size>0){const ie=sx(ne.width,ne.height,M.format,M.type);for(const xe of M.layerUpdates){const Se=ne.data.subarray(xe*ie/ne.data.BYTES_PER_ELEMENT,(xe+1)*ie/ne.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,xe,ne.width,ne.height,1,_e,Ue,Se)}M.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,ne.width,ne.height,ne.depth,_e,Ue,ne.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,ve,ne.width,ne.height,ne.depth,0,_e,Ue,ne.data);else if(M.isData3DTexture)ze?(Ge&&t.texStorage3D(n.TEXTURE_3D,pe,ve,ne.width,ne.height,ne.depth),k&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,ne.width,ne.height,ne.depth,_e,Ue,ne.data)):t.texImage3D(n.TEXTURE_3D,0,ve,ne.width,ne.height,ne.depth,0,_e,Ue,ne.data);else if(M.isFramebufferTexture){if(Ge)if(ze)t.texStorage2D(n.TEXTURE_2D,pe,ve,ne.width,ne.height);else{let ie=ne.width,xe=ne.height;for(let Se=0;Se<pe;Se++)t.texImage2D(n.TEXTURE_2D,Se,ve,ie,xe,0,_e,Ue,null),ie>>=1,xe>>=1}}else if(M.isHTMLTexture){if("texElementImage2D"in n){const ie=n.canvas;if(ie.hasAttribute("layoutsubtree")||ie.setAttribute("layoutsubtree","true"),ne.parentNode!==ie){ie.appendChild(ne),d.add(M),ie.onpaint=xe=>{const Se=xe.changedElements;for(const ae of d)Se.includes(ae.image)&&(ae.needsUpdate=!0)},ie.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,ne);else{const Se=n.RGBA,ae=n.RGBA,le=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,Se,ae,le,ne)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(de.length>0){if(ze&&Ge){const ie=qe(de[0]);t.texStorage2D(n.TEXTURE_2D,pe,ve,ie.width,ie.height)}for(let ie=0,xe=de.length;ie<xe;ie++)ge=de[ie],ze?k&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,_e,Ue,ge):t.texImage2D(n.TEXTURE_2D,ie,ve,_e,Ue,ge);M.generateMipmaps=!1}else if(ze){if(Ge){const ie=qe(ne);t.texStorage2D(n.TEXTURE_2D,pe,ve,ie.width,ie.height)}k&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,_e,Ue,ne)}else t.texImage2D(n.TEXTURE_2D,0,ve,_e,Ue,ne);p(M)&&v(Y),ce.__version=he.version,M.onUpdate&&M.onUpdate(M)}P.__version=M.version}function De(P,M,H){if(M.image.length!==6)return;const Y=$(P,M),J=M.source;t.bindTexture(n.TEXTURE_CUBE_MAP,P.__webglTexture,n.TEXTURE0+H);const he=i.get(J);if(J.version!==he.__version||Y===!0){t.activeTexture(n.TEXTURE0+H);const ce=ft.getPrimaries(ft.workingColorSpace),ee=M.colorSpace===Os?null:ft.getPrimaries(M.colorSpace),ne=M.colorSpace===Os||ce===ee?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),t.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,ne);const _e=M.isCompressedTexture||M.image[0].isCompressedTexture,Ue=M.image[0]&&M.image[0].isDataTexture,ve=[];for(let ae=0;ae<6;ae++)!_e&&!Ue?ve[ae]=g(M.image[ae],!0,r.maxCubemapSize):ve[ae]=Ue?M.image[ae].image:M.image[ae],ve[ae]=Yt(M,ve[ae]);const ge=ve[0],de=s.convert(M.format,M.colorSpace),ze=s.convert(M.type),Ge=x(M.internalFormat,de,ze,M.normalized,M.colorSpace),k=M.isVideoTexture!==!0,pe=he.__version===void 0||Y===!0,ie=J.dataReady;let xe=T(M,ge);Ce(n.TEXTURE_CUBE_MAP,M);let Se;if(_e){k&&pe&&t.texStorage2D(n.TEXTURE_CUBE_MAP,xe,Ge,ge.width,ge.height);for(let ae=0;ae<6;ae++){Se=ve[ae].mipmaps;for(let le=0;le<Se.length;le++){const oe=Se[le];M.format!==gr?de!==null?k?ie&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le,0,0,oe.width,oe.height,de,oe.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le,Ge,oe.width,oe.height,0,oe.data):$e("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):k?ie&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le,0,0,oe.width,oe.height,de,ze,oe.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le,Ge,oe.width,oe.height,0,de,ze,oe.data)}}}else{if(Se=M.mipmaps,k&&pe){Se.length>0&&xe++;const ae=qe(ve[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,xe,Ge,ae.width,ae.height)}for(let ae=0;ae<6;ae++)if(Ue){k?ie&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,0,0,ve[ae].width,ve[ae].height,de,ze,ve[ae].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,Ge,ve[ae].width,ve[ae].height,0,de,ze,ve[ae].data);for(let le=0;le<Se.length;le++){const We=Se[le].image[ae].image;k?ie&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le+1,0,0,We.width,We.height,de,ze,We.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le+1,Ge,We.width,We.height,0,de,ze,We.data)}}else{k?ie&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,0,0,de,ze,ve[ae]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,Ge,de,ze,ve[ae]);for(let le=0;le<Se.length;le++){const oe=Se[le];k?ie&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le+1,0,0,de,ze,oe.image[ae]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ae,le+1,Ge,de,ze,oe.image[ae])}}}p(M)&&v(n.TEXTURE_CUBE_MAP),he.__version=J.version,M.onUpdate&&M.onUpdate(M)}P.__version=M.version}function ye(P,M,H,Y,J,he){const ce=s.convert(H.format,H.colorSpace),ee=s.convert(H.type),ne=x(H.internalFormat,ce,ee,H.normalized,H.colorSpace),_e=i.get(M),Ue=i.get(H);if(Ue.__renderTarget=M,!_e.__hasExternalTextures){const ve=Math.max(1,M.width>>he),ge=Math.max(1,M.height>>he);J===n.TEXTURE_3D||J===n.TEXTURE_2D_ARRAY?t.texImage3D(J,he,ne,ve,ge,M.depth,0,ce,ee,null):t.texImage2D(J,he,ne,ve,ge,0,ce,ee,null)}t.bindFramebuffer(n.FRAMEBUFFER,P),xt(M)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,Y,J,Ue.__webglTexture,0,Ke(M)):(J===n.TEXTURE_2D||J>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,Y,J,Ue.__webglTexture,he),t.bindFramebuffer(n.FRAMEBUFFER,null)}function je(P,M,H){if(n.bindRenderbuffer(n.RENDERBUFFER,P),M.depthBuffer){const Y=M.depthTexture,J=Y&&Y.isDepthTexture?Y.type:null,he=E(M.stencilBuffer,J),ce=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;xt(M)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ke(M),he,M.width,M.height):H?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ke(M),he,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,he,M.width,M.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,ce,n.RENDERBUFFER,P)}else{const Y=M.textures;for(let J=0;J<Y.length;J++){const he=Y[J],ce=s.convert(he.format,he.colorSpace),ee=s.convert(he.type),ne=x(he.internalFormat,ce,ee,he.normalized,he.colorSpace);xt(M)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ke(M),ne,M.width,M.height):H?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ke(M),ne,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,ne,M.width,M.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function me(P,M,H){const Y=M.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,P),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const J=i.get(M.depthTexture);if(J.__renderTarget=M,(!J.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),Y){if(J.__webglInit===void 0&&(J.__webglInit=!0,M.depthTexture.addEventListener("dispose",w)),J.__webglTexture===void 0){J.__webglTexture=n.createTexture(),t.bindTexture(n.TEXTURE_CUBE_MAP,J.__webglTexture),Ce(n.TEXTURE_CUBE_MAP,M.depthTexture);const _e=s.convert(M.depthTexture.format),Ue=s.convert(M.depthTexture.type);let ve;M.depthTexture.format===_s?ve=n.DEPTH_COMPONENT24:M.depthTexture.format===La&&(ve=n.DEPTH24_STENCIL8);for(let ge=0;ge<6;ge++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ge,0,ve,M.width,M.height,0,_e,Ue,null)}}else N(M.depthTexture,0);const he=J.__webglTexture,ce=Ke(M),ee=Y?n.TEXTURE_CUBE_MAP_POSITIVE_X+H:n.TEXTURE_2D,ne=M.depthTexture.format===La?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(M.depthTexture.format===_s)xt(M)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ne,ee,he,0,ce):n.framebufferTexture2D(n.FRAMEBUFFER,ne,ee,he,0);else if(M.depthTexture.format===La)xt(M)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ne,ee,he,0,ce):n.framebufferTexture2D(n.FRAMEBUFFER,ne,ee,he,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Re(P){const M=i.get(P),H=P.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==P.depthTexture){const Y=P.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),Y){const J=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,Y.removeEventListener("dispose",J)};Y.addEventListener("dispose",J),M.__depthDisposeCallback=J}M.__boundDepthTexture=Y}if(P.depthTexture&&!M.__autoAllocateDepthBuffer)if(H)for(let Y=0;Y<6;Y++)me(M.__webglFramebuffer[Y],P,Y);else{const Y=P.texture.mipmaps;Y&&Y.length>0?me(M.__webglFramebuffer[0],P,0):me(M.__webglFramebuffer,P,0)}else if(H){M.__webglDepthbuffer=[];for(let Y=0;Y<6;Y++)if(t.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer[Y]),M.__webglDepthbuffer[Y]===void 0)M.__webglDepthbuffer[Y]=n.createRenderbuffer(),je(M.__webglDepthbuffer[Y],P,!1);else{const J=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,he=M.__webglDepthbuffer[Y];n.bindRenderbuffer(n.RENDERBUFFER,he),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,he)}}else{const Y=P.texture.mipmaps;if(Y&&Y.length>0?t.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=n.createRenderbuffer(),je(M.__webglDepthbuffer,P,!1);else{const J=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,he=M.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,he),n.framebufferRenderbuffer(n.FRAMEBUFFER,J,n.RENDERBUFFER,he)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ne(P,M,H){const Y=i.get(P);M!==void 0&&ye(Y.__webglFramebuffer,P,P.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),H!==void 0&&Re(P)}function ke(P){const M=P.texture,H=i.get(P),Y=i.get(M);P.addEventListener("dispose",y);const J=P.textures,he=P.isWebGLCubeRenderTarget===!0,ce=J.length>1;if(ce||(Y.__webglTexture===void 0&&(Y.__webglTexture=n.createTexture()),Y.__version=M.version,a.memory.textures++),he){H.__webglFramebuffer=[];for(let ee=0;ee<6;ee++)if(M.mipmaps&&M.mipmaps.length>0){H.__webglFramebuffer[ee]=[];for(let ne=0;ne<M.mipmaps.length;ne++)H.__webglFramebuffer[ee][ne]=n.createFramebuffer()}else H.__webglFramebuffer[ee]=n.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){H.__webglFramebuffer=[];for(let ee=0;ee<M.mipmaps.length;ee++)H.__webglFramebuffer[ee]=n.createFramebuffer()}else H.__webglFramebuffer=n.createFramebuffer();if(ce)for(let ee=0,ne=J.length;ee<ne;ee++){const _e=i.get(J[ee]);_e.__webglTexture===void 0&&(_e.__webglTexture=n.createTexture(),a.memory.textures++)}if(P.samples>0&&xt(P)===!1){H.__webglMultisampledFramebuffer=n.createFramebuffer(),H.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let ee=0;ee<J.length;ee++){const ne=J[ee];H.__webglColorRenderbuffer[ee]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,H.__webglColorRenderbuffer[ee]);const _e=s.convert(ne.format,ne.colorSpace),Ue=s.convert(ne.type),ve=x(ne.internalFormat,_e,Ue,ne.normalized,ne.colorSpace,P.isXRRenderTarget===!0),ge=Ke(P);n.renderbufferStorageMultisample(n.RENDERBUFFER,ge,ve,P.width,P.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ee,n.RENDERBUFFER,H.__webglColorRenderbuffer[ee])}n.bindRenderbuffer(n.RENDERBUFFER,null),P.depthBuffer&&(H.__webglDepthRenderbuffer=n.createRenderbuffer(),je(H.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(he){t.bindTexture(n.TEXTURE_CUBE_MAP,Y.__webglTexture),Ce(n.TEXTURE_CUBE_MAP,M);for(let ee=0;ee<6;ee++)if(M.mipmaps&&M.mipmaps.length>0)for(let ne=0;ne<M.mipmaps.length;ne++)ye(H.__webglFramebuffer[ee][ne],P,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ne);else ye(H.__webglFramebuffer[ee],P,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0);p(M)&&v(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ce){for(let ee=0,ne=J.length;ee<ne;ee++){const _e=J[ee],Ue=i.get(_e);let ve=n.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ve=P.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ve,Ue.__webglTexture),Ce(ve,_e),ye(H.__webglFramebuffer,P,_e,n.COLOR_ATTACHMENT0+ee,ve,0),p(_e)&&v(ve)}t.unbindTexture()}else{let ee=n.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ee=P.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ee,Y.__webglTexture),Ce(ee,M),M.mipmaps&&M.mipmaps.length>0)for(let ne=0;ne<M.mipmaps.length;ne++)ye(H.__webglFramebuffer[ne],P,M,n.COLOR_ATTACHMENT0,ee,ne);else ye(H.__webglFramebuffer,P,M,n.COLOR_ATTACHMENT0,ee,0);p(M)&&v(ee),t.unbindTexture()}P.depthBuffer&&Re(P)}function W(P){const M=P.textures;for(let H=0,Y=M.length;H<Y;H++){const J=M[H];if(p(J)){const he=S(P),ce=i.get(J).__webglTexture;t.bindTexture(he,ce),v(he),t.unbindTexture()}}}const et=[],ut=[];function Pt(P){if(P.samples>0){if(xt(P)===!1){const M=P.textures,H=P.width,Y=P.height;let J=n.COLOR_BUFFER_BIT;const he=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ce=i.get(P),ee=M.length>1;if(ee)for(let _e=0;_e<M.length;_e++)t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+_e,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+_e,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ce.__webglMultisampledFramebuffer);const ne=P.texture.mipmaps;ne&&ne.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglFramebuffer);for(let _e=0;_e<M.length;_e++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(J|=n.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(J|=n.STENCIL_BUFFER_BIT)),ee){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ce.__webglColorRenderbuffer[_e]);const Ue=i.get(M[_e]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Ue,0)}n.blitFramebuffer(0,0,H,Y,0,0,H,Y,J,n.NEAREST),l===!0&&(et.length=0,ut.length=0,et.push(n.COLOR_ATTACHMENT0+_e),P.depthBuffer&&P.resolveDepthBuffer===!1&&(et.push(he),ut.push(he),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,ut)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,et))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ee)for(let _e=0;_e<M.length;_e++){t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+_e,n.RENDERBUFFER,ce.__webglColorRenderbuffer[_e]);const Ue=i.get(M[_e]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+_e,n.TEXTURE_2D,Ue,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){const M=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[M])}}}function Ke(P){return Math.min(r.maxSamples,P.samples)}function xt(P){const M=i.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function B(P){const M=a.render.frame;c.get(P)!==M&&(c.set(P,M),P.update())}function Yt(P,M){const H=P.colorSpace,Y=P.format,J=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||H!==md&&H!==Os&&(ft.getTransfer(H)===Mt?(Y!==gr||J!==Ji)&&$e("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):gt("WebGLTextures: Unsupported texture color space:",H)),M}function qe(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(u.width=P.naturalWidth||P.width,u.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(u.width=P.displayWidth,u.height=P.displayHeight):(u.width=P.width,u.height=P.height),u}this.allocateTextureUnit=G,this.resetTextureUnits=z,this.getTextureUnits=I,this.setTextureUnits=F,this.setTexture2D=N,this.setTexture2DArray=O,this.setTexture3D=b,this.setTextureCube=Q,this.rebindTextures=Ne,this.setupRenderTarget=ke,this.updateRenderTargetMipmap=W,this.updateMultisampleRenderTarget=Pt,this.setupDepthRenderbuffer=Re,this.setupFrameBufferTexture=ye,this.useMultisampledRTT=xt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function DP(n,e){function t(i,r=Os){let s;const a=ft.getTransfer(r);if(i===Ji)return n.UNSIGNED_BYTE;if(i===N0)return n.UNSIGNED_SHORT_4_4_4_4;if(i===I0)return n.UNSIGNED_SHORT_5_5_5_1;if(i===KS)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===ZS)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===qS)return n.BYTE;if(i===$S)return n.SHORT;if(i===Yu)return n.UNSIGNED_SHORT;if(i===L0)return n.INT;if(i===Gr)return n.UNSIGNED_INT;if(i===Nr)return n.FLOAT;if(i===gs)return n.HALF_FLOAT;if(i===jS)return n.ALPHA;if(i===QS)return n.RGB;if(i===gr)return n.RGBA;if(i===_s)return n.DEPTH_COMPONENT;if(i===La)return n.DEPTH_STENCIL;if(i===JS)return n.RED;if(i===U0)return n.RED_INTEGER;if(i===Za)return n.RG;if(i===F0)return n.RG_INTEGER;if(i===O0)return n.RGBA_INTEGER;if(i===bf||i===Pf||i===Df||i===Lf)if(a===Mt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===bf)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Pf)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Df)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Lf)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===bf)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Pf)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Df)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Lf)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Lm||i===Nm||i===Im||i===Um)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Lm)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Nm)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Im)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Um)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Fm||i===Om||i===km||i===Bm||i===zm||i===hd||i===Vm)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Fm||i===Om)return a===Mt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===km)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(i===Bm)return s.COMPRESSED_R11_EAC;if(i===zm)return s.COMPRESSED_SIGNED_R11_EAC;if(i===hd)return s.COMPRESSED_RG11_EAC;if(i===Vm)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Hm||i===Gm||i===Wm||i===Xm||i===Ym||i===qm||i===$m||i===Km||i===Zm||i===jm||i===Qm||i===Jm||i===eg||i===tg)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Hm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Gm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Wm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Xm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ym)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===qm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===$m)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Km)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Zm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===jm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Qm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Jm)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===eg)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===tg)return a===Mt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===ng||i===ig||i===rg)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===ng)return a===Mt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===ig)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===rg)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===sg||i===ag||i===pd||i===og)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===sg)return s.COMPRESSED_RED_RGTC1_EXT;if(i===ag)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===pd)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===og)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===qu?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const LP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,NP=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class IP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new cM(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new Sr({vertexShader:LP,fragmentShader:NP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Wr(new hc(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class UP extends no{constructor(e,t){super();const i=this;let r=null,s=1,a=null,o="local-floor",l=1,u=null,c=null,d=null,f=null,h=null,m=null;const _=typeof XRWebGLBinding<"u",g=new IP,p={},v=t.getContextAttributes();let S=null,x=null;const E=[],T=[],w=new ht;let y=null;const A=new mr;A.viewport=new Zt;const R=new mr;R.viewport=new Zt;const D=[A,R],L=new WC;let z=null,I=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let se=E[$];return se===void 0&&(se=new zh,E[$]=se),se.getTargetRaySpace()},this.getControllerGrip=function($){let se=E[$];return se===void 0&&(se=new zh,E[$]=se),se.getGripSpace()},this.getHand=function($){let se=E[$];return se===void 0&&(se=new zh,E[$]=se),se.getHandSpace()};function F($){const se=T.indexOf($.inputSource);if(se===-1)return;const re=E[se];re!==void 0&&(re.update($.inputSource,$.frame,u||a),re.dispatchEvent({type:$.type,data:$.inputSource}))}function G(){r.removeEventListener("select",F),r.removeEventListener("selectstart",F),r.removeEventListener("selectend",F),r.removeEventListener("squeeze",F),r.removeEventListener("squeezestart",F),r.removeEventListener("squeezeend",F),r.removeEventListener("end",G),r.removeEventListener("inputsourceschange",U);for(let $=0;$<E.length;$++){const se=T[$];se!==null&&(T[$]=null,E[$].disconnect(se))}z=null,I=null,g.reset();for(const $ in p)delete p[$];e.setRenderTarget(S),h=null,f=null,d=null,r=null,x=null,Ce.stop(),i.isPresenting=!1,e.setPixelRatio(y),e.setSize(w.width,w.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){s=$,i.isPresenting===!0&&$e("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){o=$,i.isPresenting===!0&&$e("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return u||a},this.setReferenceSpace=function($){u=$},this.getBaseLayer=function(){return f!==null?f:h},this.getBinding=function(){return d===null&&_&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function($){if(r=$,r!==null){if(S=e.getRenderTarget(),r.addEventListener("select",F),r.addEventListener("selectstart",F),r.addEventListener("selectend",F),r.addEventListener("squeeze",F),r.addEventListener("squeezestart",F),r.addEventListener("squeezeend",F),r.addEventListener("end",G),r.addEventListener("inputsourceschange",U),v.xrCompatible!==!0&&await t.makeXRCompatible(),y=e.getPixelRatio(),e.getSize(w),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let re=null,Ae=null,De=null;v.depth&&(De=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,re=v.stencil?La:_s,Ae=v.stencil?qu:Gr);const ye={colorFormat:t.RGBA8,depthFormat:De,scaleFactor:s};d=this.getBinding(),f=d.createProjectionLayer(ye),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),x=new zr(f.textureWidth,f.textureHeight,{format:gr,type:Ji,depthTexture:new gl(f.textureWidth,f.textureHeight,Ae,void 0,void 0,void 0,void 0,void 0,void 0,re),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const re={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:s};h=new XRWebGLLayer(r,t,re),r.updateRenderState({baseLayer:h}),e.setPixelRatio(1),e.setSize(h.framebufferWidth,h.framebufferHeight,!1),x=new zr(h.framebufferWidth,h.framebufferHeight,{format:gr,type:Ji,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),u=null,a=await r.requestReferenceSpace(o),Ce.setContext(r),Ce.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function U($){for(let se=0;se<$.removed.length;se++){const re=$.removed[se],Ae=T.indexOf(re);Ae>=0&&(T[Ae]=null,E[Ae].disconnect(re))}for(let se=0;se<$.added.length;se++){const re=$.added[se];let Ae=T.indexOf(re);if(Ae===-1){for(let ye=0;ye<E.length;ye++)if(ye>=T.length){T.push(re),Ae=ye;break}else if(T[ye]===null){T[ye]=re,Ae=ye;break}if(Ae===-1)break}const De=E[Ae];De&&De.connect(re)}}const N=new Z,O=new Z;function b($,se,re){N.setFromMatrixPosition(se.matrixWorld),O.setFromMatrixPosition(re.matrixWorld);const Ae=N.distanceTo(O),De=se.projectionMatrix.elements,ye=re.projectionMatrix.elements,je=De[14]/(De[10]-1),me=De[14]/(De[10]+1),Re=(De[9]+1)/De[5],Ne=(De[9]-1)/De[5],ke=(De[8]-1)/De[0],W=(ye[8]+1)/ye[0],et=je*ke,ut=je*W,Pt=Ae/(-ke+W),Ke=Pt*-ke;if(se.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(Ke),$.translateZ(Pt),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),De[10]===-1)$.projectionMatrix.copy(se.projectionMatrix),$.projectionMatrixInverse.copy(se.projectionMatrixInverse);else{const xt=je+Pt,B=me+Pt,Yt=et-Ke,qe=ut+(Ae-Ke),P=Re*me/B*xt,M=Ne*me/B*xt;$.projectionMatrix.makePerspective(Yt,qe,P,M,xt,B),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function Q($,se){se===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(se.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(r===null)return;let se=$.near,re=$.far;g.texture!==null&&(g.depthNear>0&&(se=g.depthNear),g.depthFar>0&&(re=g.depthFar)),L.near=R.near=A.near=se,L.far=R.far=A.far=re,(z!==L.near||I!==L.far)&&(r.updateRenderState({depthNear:L.near,depthFar:L.far}),z=L.near,I=L.far),L.layers.mask=$.layers.mask|6,A.layers.mask=L.layers.mask&-5,R.layers.mask=L.layers.mask&-3;const Ae=$.parent,De=L.cameras;Q(L,Ae);for(let ye=0;ye<De.length;ye++)Q(De[ye],Ae);De.length===2?b(L,A,R):L.projectionMatrix.copy(A.projectionMatrix),te($,L,Ae)};function te($,se,re){re===null?$.matrix.copy(se.matrixWorld):($.matrix.copy(re.matrixWorld),$.matrix.invert(),$.matrix.multiply(se.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(se.projectionMatrix),$.projectionMatrixInverse.copy(se.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=lg*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(f===null&&h===null))return l},this.setFoveation=function($){l=$,f!==null&&(f.fixedFoveation=$),h!==null&&h.fixedFoveation!==void 0&&(h.fixedFoveation=$)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(L)},this.getCameraTexture=function($){return p[$]};let Oe=null;function be($,se){if(c=se.getViewerPose(u||a),m=se,c!==null){const re=c.views;h!==null&&(e.setRenderTargetFramebuffer(x,h.framebuffer),e.setRenderTarget(x));let Ae=!1;re.length!==L.cameras.length&&(L.cameras.length=0,Ae=!0);for(let me=0;me<re.length;me++){const Re=re[me];let Ne=null;if(h!==null)Ne=h.getViewport(Re);else{const W=d.getViewSubImage(f,Re);Ne=W.viewport,me===0&&(e.setRenderTargetTextures(x,W.colorTexture,W.depthStencilTexture),e.setRenderTarget(x))}let ke=D[me];ke===void 0&&(ke=new mr,ke.layers.enable(me),ke.viewport=new Zt,D[me]=ke),ke.matrix.fromArray(Re.transform.matrix),ke.matrix.decompose(ke.position,ke.quaternion,ke.scale),ke.projectionMatrix.fromArray(Re.projectionMatrix),ke.projectionMatrixInverse.copy(ke.projectionMatrix).invert(),ke.viewport.set(Ne.x,Ne.y,Ne.width,Ne.height),me===0&&(L.matrix.copy(ke.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),Ae===!0&&L.cameras.push(ke)}const De=r.enabledFeatures;if(De&&De.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&_){d=i.getBinding();const me=d.getDepthInformation(re[0]);me&&me.isValid&&me.texture&&g.init(me,r.renderState)}if(De&&De.includes("camera-access")&&_){e.state.unbindTexture(),d=i.getBinding();for(let me=0;me<re.length;me++){const Re=re[me].camera;if(Re){let Ne=p[Re];Ne||(Ne=new cM,p[Re]=Ne);const ke=d.getCameraImage(Re);Ne.sourceTexture=ke}}}}for(let re=0;re<E.length;re++){const Ae=T[re],De=E[re];Ae!==null&&De!==void 0&&De.update(Ae,se,u||a)}Oe&&Oe($,se),se.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:se}),m=null}const Ce=new hM;Ce.setAnimationLoop(be),this.setAnimationLoop=function($){Oe=$},this.dispose=function(){}}}const FP=new hn,yM=new Qe;yM.set(-1,0,0,0,1,0,0,0,1);function OP(n,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function i(g,p){p.color.getRGB(g.fogColor.value,fM(n)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function r(g,p,v,S,x){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?s(g,p):p.isMeshLambertMaterial?(s(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(s(g,p),d(g,p)):p.isMeshPhongMaterial?(s(g,p),c(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(s(g,p),f(g,p),p.isMeshPhysicalMaterial&&h(g,p,x)):p.isMeshMatcapMaterial?(s(g,p),m(g,p)):p.isMeshDepthMaterial?s(g,p):p.isMeshDistanceMaterial?(s(g,p),_(g,p)):p.isMeshNormalMaterial?s(g,p):p.isLineBasicMaterial?(a(g,p),p.isLineDashedMaterial&&o(g,p)):p.isPointsMaterial?l(g,p,v,S):p.isSpriteMaterial?u(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===_i&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===_i&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);const v=e.get(p),S=v.envMap,x=v.envMapRotation;S&&(g.envMap.value=S,g.envMapRotation.value.setFromMatrix4(FP.makeRotationFromEuler(x)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(yM),g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function a(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function o(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function l(g,p,v,S){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*v,g.scale.value=S*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function u(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function c(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function d(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function f(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function h(g,p,v){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===_i&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=v.texture,g.transmissionSamplerSize.value.set(v.width,v.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function _(g,p){const v=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(v.matrixWorld),g.nearDistance.value=v.shadow.camera.near,g.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function kP(n,e,t,i){let r={},s={},a=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(x,E){const T=E.program;i.uniformBlockBinding(x,T)}function u(x,E){let T=r[x.id];T===void 0&&(g(x),T=c(x),r[x.id]=T,x.addEventListener("dispose",v));const w=E.program;i.updateUBOMapping(x,w);const y=e.render.frame;s[x.id]!==y&&(f(x),s[x.id]=y)}function c(x){const E=d();x.__bindingPointIndex=E;const T=n.createBuffer(),w=x.__size,y=x.usage;return n.bindBuffer(n.UNIFORM_BUFFER,T),n.bufferData(n.UNIFORM_BUFFER,w,y),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,E,T),T}function d(){for(let x=0;x<o;x++)if(a.indexOf(x)===-1)return a.push(x),x;return gt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(x){const E=r[x.id],T=x.uniforms,w=x.__cache;n.bindBuffer(n.UNIFORM_BUFFER,E);for(let y=0,A=T.length;y<A;y++){const R=T[y];if(Array.isArray(R))for(let D=0,L=R.length;D<L;D++)h(R[D],y,D,w);else h(R,y,0,w)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function h(x,E,T,w){if(_(x,E,T,w)===!0){const y=x.__offset,A=x.value;if(Array.isArray(A)){let R=0;for(let D=0;D<A.length;D++){const L=A[D],z=p(L);m(L,x.__data,R),typeof L!="number"&&typeof L!="boolean"&&!L.isMatrix3&&!ArrayBuffer.isView(L)&&(R+=z.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(A,x.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,y,x.__data)}}function m(x,E,T){typeof x=="number"||typeof x=="boolean"?E[0]=x:x.isMatrix3?(E[0]=x.elements[0],E[1]=x.elements[1],E[2]=x.elements[2],E[3]=0,E[4]=x.elements[3],E[5]=x.elements[4],E[6]=x.elements[5],E[7]=0,E[8]=x.elements[6],E[9]=x.elements[7],E[10]=x.elements[8],E[11]=0):ArrayBuffer.isView(x)?E.set(new x.constructor(x.buffer,x.byteOffset,E.length)):x.toArray(E,T)}function _(x,E,T,w){const y=x.value,A=E+"_"+T;if(w[A]===void 0)return typeof y=="number"||typeof y=="boolean"?w[A]=y:ArrayBuffer.isView(y)?w[A]=y.slice():w[A]=y.clone(),!0;{const R=w[A];if(typeof y=="number"||typeof y=="boolean"){if(R!==y)return w[A]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(R.equals(y)===!1)return R.copy(y),!0}}return!1}function g(x){const E=x.uniforms;let T=0;const w=16;for(let A=0,R=E.length;A<R;A++){const D=Array.isArray(E[A])?E[A]:[E[A]];for(let L=0,z=D.length;L<z;L++){const I=D[L],F=Array.isArray(I.value)?I.value:[I.value];for(let G=0,U=F.length;G<U;G++){const N=F[G],O=p(N),b=T%w,Q=b%O.boundary,te=b+Q;T+=Q,te!==0&&w-te<O.storage&&(T+=w-te),I.__data=new Float32Array(O.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=T,T+=O.storage}}}const y=T%w;return y>0&&(T+=w-y),x.__size=T,x.__cache={},this}function p(x){const E={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(E.boundary=4,E.storage=4):x.isVector2?(E.boundary=8,E.storage=8):x.isVector3||x.isColor?(E.boundary=16,E.storage=12):x.isVector4?(E.boundary=16,E.storage=16):x.isMatrix3?(E.boundary=48,E.storage=48):x.isMatrix4?(E.boundary=64,E.storage=64):x.isTexture?$e("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(E.boundary=16,E.storage=x.byteLength):$e("WebGLRenderer: Unsupported uniform value type.",x),E}function v(x){const E=x.target;E.removeEventListener("dispose",v);const T=a.indexOf(E.__bindingPointIndex);a.splice(T,1),n.deleteBuffer(r[E.id]),delete r[E.id],delete s[E.id]}function S(){for(const x in r)n.deleteBuffer(r[x]);a=[],r={},s={}}return{bind:l,update:u,dispose:S}}const BP=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Ar=null;function zP(){return Ar===null&&(Ar=new DC(BP,16,16,Za,gs),Ar.name="DFG_LUT",Ar.minFilter=Yn,Ar.magFilter=Yn,Ar.wrapS=ss,Ar.wrapT=ss,Ar.generateMipmaps=!1,Ar.needsUpdate=!0),Ar}class VP{constructor(e={}){const{canvas:t=oC(),context:i=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:u=!1,powerPreference:c="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:f=!1,outputBufferType:h=Ji}=e;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=a;const _=h,g=new Set([O0,F0,U0]),p=new Set([Ji,Gr,Yu,qu,N0,I0]),v=new Uint32Array(4),S=new Int32Array(4),x=new Z;let E=null,T=null;const w=[],y=[];let A=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Br,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const R=this;let D=!1,L=null,z=null,I=null,F=null;this._outputColorSpace=bi;let G=0,U=0,N=null,O=-1,b=null;const Q=new Zt,te=new Zt;let Oe=null;const be=new vt(0);let Ce=0,$=t.width,se=t.height,re=1,Ae=null,De=null;const ye=new Zt(0,0,$,se),je=new Zt(0,0,$,se);let me=!1;const Re=new lM;let Ne=!1,ke=!1;const W=new hn,et=new Z,ut=new Zt,Pt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ke=!1;function xt(){return N===null?re:1}let B=i;function Yt(C,V){return t.getContext(C,V)}try{const C={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:u,powerPreference:c,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${D0}`),t.addEventListener("webglcontextlost",We,!1),t.addEventListener("webglcontextrestored",ue,!1),t.addEventListener("webglcontextcreationerror",Xe,!1),B===null){const V="webgl2";if(B=Yt(V,C),B===null)throw Yt(V)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(C){throw gt("WebGLRenderer: "+C.message),C}let qe,P,M,H,Y,J,he,ce,ee,ne,_e,Ue,ve,ge,de,ze,Ge,k,pe,ie,xe,Se,ae;function le(){qe=new zb(B),qe.init(),xe=new DP(B,qe),P=new Lb(B,qe,e,xe),M=new bP(B,qe),P.reversedDepthBuffer&&f&&M.buffers.depth.setReversed(!0),z=B.createFramebuffer(),I=B.createFramebuffer(),F=B.createFramebuffer(),H=new Gb(B),Y=new mP,J=new PP(B,qe,M,Y,P,xe,H),he=new Bb(R),ce=new qC(B),Se=new Pb(B,ce),ee=new Vb(B,ce,H,Se),ne=new Xb(B,ee,ce,Se,H),k=new Wb(B,P,J),de=new Nb(Y),_e=new pP(R,he,qe,P,Se,de),Ue=new OP(R,Y),ve=new _P,ge=new EP(qe),Ge=new bb(R,he,M,ne,m,l),ze=new RP(R,ne,P),ae=new kP(B,H,P,M),pe=new Db(B,qe,H),ie=new Hb(B,qe,H),H.programs=_e.programs,R.capabilities=P,R.extensions=qe,R.properties=Y,R.renderLists=ve,R.shadowMap=ze,R.state=M,R.info=H}le(),_!==Ji&&(A=new qb(_,t.width,t.height,o,r,s));const oe=new UP(R,B);this.xr=oe,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){const C=qe.get("WEBGL_lose_context");C&&C.loseContext()},this.forceContextRestore=function(){const C=qe.get("WEBGL_lose_context");C&&C.restoreContext()},this.getPixelRatio=function(){return re},this.setPixelRatio=function(C){C!==void 0&&(re=C,this.setSize($,se,!1))},this.getSize=function(C){return C.set($,se)},this.setSize=function(C,V,K=!0){if(oe.isPresenting){$e("WebGLRenderer: Can't change size while VR device is presenting.");return}$=C,se=V,t.width=Math.floor(C*re),t.height=Math.floor(V*re),K===!0&&(t.style.width=C+"px",t.style.height=V+"px"),A!==null&&A.setSize(t.width,t.height),this.setViewport(0,0,C,V)},this.getDrawingBufferSize=function(C){return C.set($*re,se*re).floor()},this.setDrawingBufferSize=function(C,V,K){$=C,se=V,re=K,t.width=Math.floor(C*K),t.height=Math.floor(V*K),this.setViewport(0,0,C,V)},this.setEffects=function(C){if(_===Ji){gt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(C){for(let V=0;V<C.length;V++)if(C[V].isOutputPass===!0){$e("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}A.setEffects(C||[])},this.getCurrentViewport=function(C){return C.copy(Q)},this.getViewport=function(C){return C.copy(ye)},this.setViewport=function(C,V,K,X){C.isVector4?ye.set(C.x,C.y,C.z,C.w):ye.set(C,V,K,X),M.viewport(Q.copy(ye).multiplyScalar(re).round())},this.getScissor=function(C){return C.copy(je)},this.setScissor=function(C,V,K,X){C.isVector4?je.set(C.x,C.y,C.z,C.w):je.set(C,V,K,X),M.scissor(te.copy(je).multiplyScalar(re).round())},this.getScissorTest=function(){return me},this.setScissorTest=function(C){M.setScissorTest(me=C)},this.setOpaqueSort=function(C){Ae=C},this.setTransparentSort=function(C){De=C},this.getClearColor=function(C){return C.copy(Ge.getClearColor())},this.setClearColor=function(){Ge.setClearColor(...arguments)},this.getClearAlpha=function(){return Ge.getClearAlpha()},this.setClearAlpha=function(){Ge.setClearAlpha(...arguments)},this.clear=function(C=!0,V=!0,K=!0){let X=0;if(C){let q=!1;if(N!==null){const Me=N.texture.format;q=g.has(Me)}if(q){const Me=N.texture.type,Ee=p.has(Me),we=Ge.getClearColor(),Be=Ge.getClearAlpha(),Ve=we.r,Je=we.g,nt=we.b;Ee?(v[0]=Ve,v[1]=Je,v[2]=nt,v[3]=Be,B.clearBufferuiv(B.COLOR,0,v)):(S[0]=Ve,S[1]=Je,S[2]=nt,S[3]=Be,B.clearBufferiv(B.COLOR,0,S))}else X|=B.COLOR_BUFFER_BIT}V&&(X|=B.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),K&&(X|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),X!==0&&B.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(C){C.setRenderer(this),L=C},this.dispose=function(){t.removeEventListener("webglcontextlost",We,!1),t.removeEventListener("webglcontextrestored",ue,!1),t.removeEventListener("webglcontextcreationerror",Xe,!1),Ge.dispose(),ve.dispose(),ge.dispose(),Y.dispose(),he.dispose(),ne.dispose(),Se.dispose(),ae.dispose(),_e.dispose(),oe.dispose(),oe.removeEventListener("sessionstart",Ut),oe.removeEventListener("sessionend",wt),ct.stop()};function We(C){C.preventDefault(),zv("WebGLRenderer: Context Lost."),D=!0}function ue(){zv("WebGLRenderer: Context Restored."),D=!1;const C=H.autoReset,V=ze.enabled,K=ze.autoUpdate,X=ze.needsUpdate,q=ze.type;le(),H.autoReset=C,ze.enabled=V,ze.autoUpdate=K,ze.needsUpdate=X,ze.type=q}function Xe(C){gt("WebGLRenderer: A WebGL context could not be created. Reason: ",C.statusMessage)}function Fe(C){const V=C.target;V.removeEventListener("dispose",Fe),Ze(V)}function Ze(C){sn(C),Y.remove(C)}function sn(C){const V=Y.get(C).programs;V!==void 0&&(V.forEach(function(K){_e.releaseProgram(K)}),C.isShaderMaterial&&_e.releaseShaderCache(C))}this.renderBufferDirect=function(C,V,K,X,q,Me){V===null&&(V=Pt);const Ee=q.isMesh&&q.matrixWorld.determinantAffine()<0,we=Mn(C,V,K,X,q);M.setMaterial(X,Ee);let Be=K.index,Ve=1;if(X.wireframe===!0){if(Be=ee.getWireframeAttribute(K),Be===void 0)return;Ve=2}const Je=K.drawRange,nt=K.attributes.position;let He=Je.start*Ve,Tt=(Je.start+Je.count)*Ve;Me!==null&&(He=Math.max(He,Me.start*Ve),Tt=Math.min(Tt,(Me.start+Me.count)*Ve)),Be!==null?(He=Math.max(He,0),Tt=Math.min(Tt,Be.count)):nt!=null&&(He=Math.max(He,0),Tt=Math.min(Tt,nt.count));const Jt=Tt-He;if(Jt<0||Jt===1/0)return;Se.setup(q,X,we,K,Be);let $t,At=pe;if(Be!==null&&($t=ce.get(Be),At=ie,At.setIndex($t)),q.isMesh)X.wireframe===!0?(M.setLineWidth(X.wireframeLinewidth*xt()),At.setMode(B.LINES)):At.setMode(B.TRIANGLES);else if(q.isLine){let Fn=X.linewidth;Fn===void 0&&(Fn=1),M.setLineWidth(Fn*xt()),q.isLineSegments?At.setMode(B.LINES):q.isLineLoop?At.setMode(B.LINE_LOOP):At.setMode(B.LINE_STRIP)}else q.isPoints?At.setMode(B.POINTS):q.isSprite&&At.setMode(B.TRIANGLES);if(q.isBatchedMesh)if(qe.get("WEBGL_multi_draw"))At.renderMultiDraw(q._multiDrawStarts,q._multiDrawCounts,q._multiDrawCount);else{const Fn=q._multiDrawStarts,Pe=q._multiDrawCounts,Ei=q._multiDrawCount,mt=Be?ce.get(Be).bytesPerElement:1,Yi=Y.get(X).currentProgram.getUniforms();for(let Er=0;Er<Ei;Er++)Yi.setValue(B,"_gl_DrawID",Er),At.render(Fn[Er]/mt,Pe[Er])}else if(q.isInstancedMesh)At.renderInstances(He,Jt,q.count);else if(K.isInstancedBufferGeometry){const Fn=K._maxInstanceCount!==void 0?K._maxInstanceCount:1/0,Pe=Math.min(K.instanceCount,Fn);At.renderInstances(He,Jt,Pe)}else At.render(He,Jt)};function rt(C,V,K){C.transparent===!0&&C.side===ts&&C.forceSinglePass===!1?(C.side=_i,C.needsUpdate=!0,qt(C,V,K),C.side=sa,C.needsUpdate=!0,qt(C,V,K),C.side=ts):qt(C,V,K)}this.compile=function(C,V,K=null){K===null&&(K=C),T=ge.get(K),T.init(V),y.push(T),K.traverseVisible(function(q){q.isLight&&q.layers.test(V.layers)&&(T.pushLight(q),q.castShadow&&T.pushShadow(q))}),C!==K&&C.traverseVisible(function(q){q.isLight&&q.layers.test(V.layers)&&(T.pushLight(q),q.castShadow&&T.pushShadow(q))}),T.setupLights();const X=new Set;return C.traverse(function(q){if(!(q.isMesh||q.isPoints||q.isLine||q.isSprite))return;const Me=q.material;if(Me)if(Array.isArray(Me))for(let Ee=0;Ee<Me.length;Ee++){const we=Me[Ee];rt(we,K,q),X.add(we)}else rt(Me,K,q),X.add(Me)}),T=y.pop(),X},this.compileAsync=function(C,V,K=null){const X=this.compile(C,V,K);return new Promise(q=>{function Me(){if(X.forEach(function(Ee){Y.get(Ee).currentProgram.isReady()&&X.delete(Ee)}),X.size===0){q(C);return}setTimeout(Me,10)}qe.get("KHR_parallel_shader_compile")!==null?Me():setTimeout(Me,10)})};let It=null;function Sn(C){It&&It(C)}function Ut(){ct.stop()}function wt(){ct.start()}const ct=new hM;ct.setAnimationLoop(Sn),typeof self<"u"&&ct.setContext(self),this.setAnimationLoop=function(C){It=C,oe.setAnimationLoop(C),C===null?ct.stop():ct.start()},oe.addEventListener("sessionstart",Ut),oe.addEventListener("sessionend",wt),this.render=function(C,V){if(V!==void 0&&V.isCamera!==!0){gt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(D===!0)return;L!==null&&L.renderStart(C,V);const K=oe.enabled===!0&&oe.isPresenting===!0,X=A!==null&&(N===null||K)&&A.begin(R,N);if(C.matrixWorldAutoUpdate===!0&&C.updateMatrixWorld(),V.parent===null&&V.matrixWorldAutoUpdate===!0&&V.updateMatrixWorld(),oe.enabled===!0&&oe.isPresenting===!0&&(A===null||A.isCompositing()===!1)&&(oe.cameraAutoUpdate===!0&&oe.updateCamera(V),V=oe.getCamera()),C.isScene===!0&&C.onBeforeRender(R,C,V,N),T=ge.get(C,y.length),T.init(V),T.state.textureUnits=J.getTextureUnits(),y.push(T),W.multiplyMatrices(V.projectionMatrix,V.matrixWorldInverse),Re.setFromProjectionMatrix(W,Ir,V.reversedDepth),ke=this.localClippingEnabled,Ne=de.init(this.clippingPlanes,ke),E=ve.get(C,w.length),E.init(),w.push(E),oe.enabled===!0&&oe.isPresenting===!0){const Ee=R.xr.getDepthSensingMesh();Ee!==null&&Kn(Ee,V,-1/0,R.sortObjects)}Kn(C,V,0,R.sortObjects),E.finish(),R.sortObjects===!0&&E.sort(Ae,De,V.reversedDepth),Ke=oe.enabled===!1||oe.isPresenting===!1||oe.hasDepthSensing()===!1,Ke&&Ge.addToRenderList(E,C),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Ne===!0&&de.beginShadows();const q=T.state.shadowsArray;if(ze.render(q,C,V),Ne===!0&&de.endShadows(),(X&&A.hasRenderPass())===!1){const Ee=E.opaque,we=E.transmissive;if(T.setupLights(),V.isArrayCamera){const Be=V.cameras;if(we.length>0)for(let Ve=0,Je=Be.length;Ve<Je;Ve++){const nt=Be[Ve];Un(Ee,we,C,nt)}Ke&&Ge.render(C);for(let Ve=0,Je=Be.length;Ve<Je;Ve++){const nt=Be[Ve];Dt(E,C,nt,nt.viewport)}}else we.length>0&&Un(Ee,we,C,V),Ke&&Ge.render(C),Dt(E,C,V)}N!==null&&U===0&&(J.updateMultisampleRenderTarget(N),J.updateRenderTargetMipmap(N)),X&&A.end(R),C.isScene===!0&&C.onAfterRender(R,C,V),Se.resetDefaultState(),O=-1,b=null,y.pop(),y.length>0?(T=y[y.length-1],J.setTextureUnits(T.state.textureUnits),Ne===!0&&de.setGlobalState(R.clippingPlanes,T.state.camera)):T=null,w.pop(),w.length>0?E=w[w.length-1]:E=null,L!==null&&L.renderEnd()};function Kn(C,V,K,X){if(C.visible===!1)return;if(C.layers.test(V.layers)){if(C.isGroup)K=C.renderOrder;else if(C.isLOD)C.autoUpdate===!0&&C.update(V);else if(C.isLightProbeGrid)T.pushLightProbeGrid(C);else if(C.isLight)T.pushLight(C),C.castShadow&&T.pushShadow(C);else if(C.isSprite){if(!C.frustumCulled||Re.intersectsSprite(C)){X&&ut.setFromMatrixPosition(C.matrixWorld).applyMatrix4(W);const Ee=ne.update(C),we=C.material;we.visible&&E.push(C,Ee,we,K,ut.z,null)}}else if((C.isMesh||C.isLine||C.isPoints)&&(!C.frustumCulled||Re.intersectsObject(C))){const Ee=ne.update(C),we=C.material;if(X&&(C.boundingSphere!==void 0?(C.boundingSphere===null&&C.computeBoundingSphere(),ut.copy(C.boundingSphere.center)):(Ee.boundingSphere===null&&Ee.computeBoundingSphere(),ut.copy(Ee.boundingSphere.center)),ut.applyMatrix4(C.matrixWorld).applyMatrix4(W)),Array.isArray(we)){const Be=Ee.groups;for(let Ve=0,Je=Be.length;Ve<Je;Ve++){const nt=Be[Ve],He=we[nt.materialIndex];He&&He.visible&&E.push(C,Ee,He,K,ut.z,nt)}}else we.visible&&E.push(C,Ee,we,K,ut.z,null)}}const Me=C.children;for(let Ee=0,we=Me.length;Ee<we;Ee++)Kn(Me[Ee],V,K,X)}function Dt(C,V,K,X){const{opaque:q,transmissive:Me,transparent:Ee}=C;T.setupLightsView(K),Ne===!0&&de.setGlobalState(R.clippingPlanes,K),X&&M.viewport(Q.copy(X)),q.length>0&&Zn(q,V,K),Me.length>0&&Zn(Me,V,K),Ee.length>0&&Zn(Ee,V,K),M.buffers.depth.setTest(!0),M.buffers.depth.setMask(!0),M.buffers.color.setMask(!0),M.setPolygonOffset(!1)}function Un(C,V,K,X){if((K.isScene===!0?K.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[X.id]===void 0){const He=qe.has("EXT_color_buffer_half_float")||qe.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[X.id]=new zr(1,1,{generateMipmaps:!0,type:He?gs:Ji,minFilter:Da,samples:Math.max(4,P.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ft.workingColorSpace})}const Me=T.state.transmissionRenderTarget[X.id],Ee=X.viewport||Q;Me.setSize(Ee.z*R.transmissionResolutionScale,Ee.w*R.transmissionResolutionScale);const we=R.getRenderTarget(),Be=R.getActiveCubeFace(),Ve=R.getActiveMipmapLevel();R.setRenderTarget(Me),R.getClearColor(be),Ce=R.getClearAlpha(),Ce<1&&R.setClearColor(16777215,.5),R.clear(),Ke&&Ge.render(K);const Je=R.toneMapping;R.toneMapping=Br;const nt=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),T.setupLightsView(X),Ne===!0&&de.setGlobalState(R.clippingPlanes,X),Zn(C,K,X),J.updateMultisampleRenderTarget(Me),J.updateRenderTargetMipmap(Me),qe.has("WEBGL_multisampled_render_to_texture")===!1){let He=!1;for(let Tt=0,Jt=V.length;Tt<Jt;Tt++){const $t=V[Tt],{object:At,geometry:Fn,material:Pe,group:Ei}=$t;if(Pe.side===ts&&At.layers.test(X.layers)){const mt=Pe.side;Pe.side=_i,Pe.needsUpdate=!0,an(At,K,X,Fn,Pe,Ei),Pe.side=mt,Pe.needsUpdate=!0,He=!0}}He===!0&&(J.updateMultisampleRenderTarget(Me),J.updateRenderTargetMipmap(Me))}R.setRenderTarget(we,Be,Ve),R.setClearColor(be,Ce),nt!==void 0&&(X.viewport=nt),R.toneMapping=Je}function Zn(C,V,K){const X=V.isScene===!0?V.overrideMaterial:null;for(let q=0,Me=C.length;q<Me;q++){const Ee=C[q],{object:we,geometry:Be,group:Ve}=Ee;let Je=Ee.material;Je.allowOverride===!0&&X!==null&&(Je=X),we.layers.test(K.layers)&&an(we,V,K,Be,Je,Ve)}}function an(C,V,K,X,q,Me){C.onBeforeRender(R,V,K,X,q,Me),C.modelViewMatrix.multiplyMatrices(K.matrixWorldInverse,C.matrixWorld),C.normalMatrix.getNormalMatrix(C.modelViewMatrix),q.onBeforeRender(R,V,K,X,C,Me),q.transparent===!0&&q.side===ts&&q.forceSinglePass===!1?(q.side=_i,q.needsUpdate=!0,R.renderBufferDirect(K,V,X,q,C,Me),q.side=sa,q.needsUpdate=!0,R.renderBufferDirect(K,V,X,q,C,Me),q.side=ts):R.renderBufferDirect(K,V,X,q,C,Me),C.onAfterRender(R,V,K,X,q,Me)}function qt(C,V,K){V.isScene!==!0&&(V=Pt);const X=Y.get(C),q=T.state.lights,Me=T.state.shadowsArray,Ee=q.state.version,we=_e.getParameters(C,q.state,Me,V,K,T.state.lightProbeGridArray),Be=_e.getProgramCacheKey(we);let Ve=X.programs;X.environment=C.isMeshStandardMaterial||C.isMeshLambertMaterial||C.isMeshPhongMaterial?V.environment:null,X.fog=V.fog;const Je=C.isMeshStandardMaterial||C.isMeshLambertMaterial&&!C.envMap||C.isMeshPhongMaterial&&!C.envMap;X.envMap=he.get(C.envMap||X.environment,Je),X.envMapRotation=X.environment!==null&&C.envMap===null?V.environmentRotation:C.envMapRotation,Ve===void 0&&(C.addEventListener("dispose",Fe),Ve=new Map,X.programs=Ve);let nt=Ve.get(Be);if(nt!==void 0){if(X.currentProgram===nt&&X.lightsStateVersion===Ee)return Mr(C,we),nt}else we.uniforms=_e.getUniforms(C),L!==null&&C.isNodeMaterial&&L.build(C,K,we),C.onBeforeCompile(we,R),nt=_e.acquireProgram(we,Be),Ve.set(Be,nt),X.uniforms=we.uniforms;const He=X.uniforms;return(!C.isShaderMaterial&&!C.isRawShaderMaterial||C.clipping===!0)&&(He.clippingPlanes=de.uniform),Mr(C,we),X.needsLights=Xi(C),X.lightsStateVersion=Ee,X.needsLights&&(He.ambientLightColor.value=q.state.ambient,He.lightProbe.value=q.state.probe,He.directionalLights.value=q.state.directional,He.directionalLightShadows.value=q.state.directionalShadow,He.spotLights.value=q.state.spot,He.spotLightShadows.value=q.state.spotShadow,He.rectAreaLights.value=q.state.rectArea,He.ltc_1.value=q.state.rectAreaLTC1,He.ltc_2.value=q.state.rectAreaLTC2,He.pointLights.value=q.state.point,He.pointLightShadows.value=q.state.pointShadow,He.hemisphereLights.value=q.state.hemi,He.directionalShadowMatrix.value=q.state.directionalShadowMatrix,He.spotLightMatrix.value=q.state.spotLightMatrix,He.spotLightMap.value=q.state.spotLightMap,He.pointShadowMatrix.value=q.state.pointShadowMatrix),X.lightProbeGrid=T.state.lightProbeGridArray.length>0,X.currentProgram=nt,X.uniformsList=null,nt}function pn(C){if(C.uniformsList===null){const V=C.currentProgram.getUniforms();C.uniformsList=Nf.seqWithValue(V.seq,C.uniforms)}return C.uniformsList}function Mr(C,V){const K=Y.get(C);K.outputColorSpace=V.outputColorSpace,K.batching=V.batching,K.batchingColor=V.batchingColor,K.instancing=V.instancing,K.instancingColor=V.instancingColor,K.instancingMorph=V.instancingMorph,K.skinning=V.skinning,K.morphTargets=V.morphTargets,K.morphNormals=V.morphNormals,K.morphColors=V.morphColors,K.morphTargetsCount=V.morphTargetsCount,K.numClippingPlanes=V.numClippingPlanes,K.numIntersection=V.numClipIntersection,K.vertexAlphas=V.vertexAlphas,K.vertexTangents=V.vertexTangents,K.toneMapping=V.toneMapping}function ro(C,V){if(C.length===0)return null;if(C.length===1)return C[0].texture!==null?C[0]:null;x.setFromMatrixPosition(V.matrixWorld);for(let K=0,X=C.length;K<X;K++){const q=C[K];if(q.texture!==null&&q.boundingBox.containsPoint(x))return q}return null}function Mn(C,V,K,X,q){V.isScene!==!0&&(V=Pt),J.resetTextureUnits();const Me=V.fog,Ee=X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial?V.environment:null,we=N===null?R.outputColorSpace:N.isXRRenderTarget===!0?N.texture.colorSpace:ft.workingColorSpace,Be=X.isMeshStandardMaterial||X.isMeshLambertMaterial&&!X.envMap||X.isMeshPhongMaterial&&!X.envMap,Ve=he.get(X.envMap||Ee,Be),Je=X.vertexColors===!0&&!!K.attributes.color&&K.attributes.color.itemSize===4,nt=!!K.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),He=!!K.morphAttributes.position,Tt=!!K.morphAttributes.normal,Jt=!!K.morphAttributes.color;let $t=Br;X.toneMapped&&(N===null||N.isXRRenderTarget===!0)&&($t=R.toneMapping);const At=K.morphAttributes.position||K.morphAttributes.normal||K.morphAttributes.color,Fn=At!==void 0?At.length:0,Pe=Y.get(X),Ei=T.state.lights;if(Ne===!0&&(ke===!0||C!==b)){const Lt=C===b&&X.id===O;de.setState(X,C,Lt)}let mt=!1;X.version===Pe.__version?(Pe.needsLights&&Pe.lightsStateVersion!==Ei.state.version||Pe.outputColorSpace!==we||q.isBatchedMesh&&Pe.batching===!1||!q.isBatchedMesh&&Pe.batching===!0||q.isBatchedMesh&&Pe.batchingColor===!0&&q.colorTexture===null||q.isBatchedMesh&&Pe.batchingColor===!1&&q.colorTexture!==null||q.isInstancedMesh&&Pe.instancing===!1||!q.isInstancedMesh&&Pe.instancing===!0||q.isSkinnedMesh&&Pe.skinning===!1||!q.isSkinnedMesh&&Pe.skinning===!0||q.isInstancedMesh&&Pe.instancingColor===!0&&q.instanceColor===null||q.isInstancedMesh&&Pe.instancingColor===!1&&q.instanceColor!==null||q.isInstancedMesh&&Pe.instancingMorph===!0&&q.morphTexture===null||q.isInstancedMesh&&Pe.instancingMorph===!1&&q.morphTexture!==null||Pe.envMap!==Ve||X.fog===!0&&Pe.fog!==Me||Pe.numClippingPlanes!==void 0&&(Pe.numClippingPlanes!==de.numPlanes||Pe.numIntersection!==de.numIntersection)||Pe.vertexAlphas!==Je||Pe.vertexTangents!==nt||Pe.morphTargets!==He||Pe.morphNormals!==Tt||Pe.morphColors!==Jt||Pe.toneMapping!==$t||Pe.morphTargetsCount!==Fn||!!Pe.lightProbeGrid!=T.state.lightProbeGridArray.length>0)&&(mt=!0):(mt=!0,Pe.__version=X.version);let Yi=Pe.currentProgram;mt===!0&&(Yi=qt(X,V,q),L&&X.isNodeMaterial&&L.onUpdateProgram(X,Yi,Pe));let Er=!1,Ms=!1,so=!1;const Ct=Yi.getUniforms(),en=Pe.uniforms;if(M.useProgram(Yi.program)&&(Er=!0,Ms=!0,so=!0),X.id!==O&&(O=X.id,Ms=!0),Pe.needsLights){const Lt=ro(T.state.lightProbeGridArray,q);Pe.lightProbeGrid!==Lt&&(Pe.lightProbeGrid=Lt,Ms=!0)}if(Er||b!==C){M.buffers.depth.getReversed()&&C.reversedDepth!==!0&&(C._reversedDepth=!0,C.updateProjectionMatrix()),Ct.setValue(B,"projectionMatrix",C.projectionMatrix),Ct.setValue(B,"viewMatrix",C.matrixWorldInverse);const Ts=Ct.map.cameraPosition;Ts!==void 0&&Ts.setValue(B,et.setFromMatrixPosition(C.matrixWorld)),P.logarithmicDepthBuffer&&Ct.setValue(B,"logDepthBufFC",2/(Math.log(C.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&Ct.setValue(B,"isOrthographic",C.isOrthographicCamera===!0),b!==C&&(b=C,Ms=!0,so=!0)}if(Pe.needsLights&&(Ei.state.directionalShadowMap.length>0&&Ct.setValue(B,"directionalShadowMap",Ei.state.directionalShadowMap,J),Ei.state.spotShadowMap.length>0&&Ct.setValue(B,"spotShadowMap",Ei.state.spotShadowMap,J),Ei.state.pointShadowMap.length>0&&Ct.setValue(B,"pointShadowMap",Ei.state.pointShadowMap,J)),q.isSkinnedMesh){Ct.setOptional(B,q,"bindMatrix"),Ct.setOptional(B,q,"bindMatrixInverse");const Lt=q.skeleton;Lt&&(Lt.boneTexture===null&&Lt.computeBoneTexture(),Ct.setValue(B,"boneTexture",Lt.boneTexture,J))}q.isBatchedMesh&&(Ct.setOptional(B,q,"batchingTexture"),Ct.setValue(B,"batchingTexture",q._matricesTexture,J),Ct.setOptional(B,q,"batchingIdTexture"),Ct.setValue(B,"batchingIdTexture",q._indirectTexture,J),Ct.setOptional(B,q,"batchingColorTexture"),q._colorsTexture!==null&&Ct.setValue(B,"batchingColorTexture",q._colorsTexture,J));const Es=K.morphAttributes;if((Es.position!==void 0||Es.normal!==void 0||Es.color!==void 0)&&k.update(q,K,Yi),(Ms||Pe.receiveShadow!==q.receiveShadow)&&(Pe.receiveShadow=q.receiveShadow,Ct.setValue(B,"receiveShadow",q.receiveShadow)),(X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial)&&X.envMap===null&&V.environment!==null&&(en.envMapIntensity.value=V.environmentIntensity),en.dfgLUT!==void 0&&(en.dfgLUT.value=zP()),Ms){if(Ct.setValue(B,"toneMappingExposure",R.toneMappingExposure),Pe.needsLights&&Qt(en,so),Me&&X.fog===!0&&Ue.refreshFogUniforms(en,Me),Ue.refreshMaterialUniforms(en,X,re,se,T.state.transmissionRenderTarget[C.id]),Pe.needsLights&&Pe.lightProbeGrid){const Lt=Pe.lightProbeGrid;en.probesSH.value=Lt.texture,en.probesMin.value.copy(Lt.boundingBox.min),en.probesMax.value.copy(Lt.boundingBox.max),en.probesResolution.value.copy(Lt.resolution)}Nf.upload(B,pn(Pe),en,J)}if(X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(Nf.upload(B,pn(Pe),en,J),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&Ct.setValue(B,"center",q.center),Ct.setValue(B,"modelViewMatrix",q.modelViewMatrix),Ct.setValue(B,"normalMatrix",q.normalMatrix),Ct.setValue(B,"modelMatrix",q.matrixWorld),X.uniformsGroups!==void 0){const Lt=X.uniformsGroups;for(let Ts=0,ao=Lt.length;Ts<ao;Ts++){const y_=Lt[Ts];ae.update(y_,Yi),ae.bind(y_,Yi)}}return Yi}function Qt(C,V){C.ambientLightColor.needsUpdate=V,C.lightProbe.needsUpdate=V,C.directionalLights.needsUpdate=V,C.directionalLightShadows.needsUpdate=V,C.pointLights.needsUpdate=V,C.pointLightShadows.needsUpdate=V,C.spotLights.needsUpdate=V,C.spotLightShadows.needsUpdate=V,C.rectAreaLights.needsUpdate=V,C.hemisphereLights.needsUpdate=V}function Xi(C){return C.isMeshLambertMaterial||C.isMeshToonMaterial||C.isMeshPhongMaterial||C.isMeshStandardMaterial||C.isShadowMaterial||C.isShaderMaterial&&C.lights===!0}this.getActiveCubeFace=function(){return G},this.getActiveMipmapLevel=function(){return U},this.getRenderTarget=function(){return N},this.setRenderTargetTextures=function(C,V,K){const X=Y.get(C);X.__autoAllocateDepthBuffer=C.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),Y.get(C.texture).__webglTexture=V,Y.get(C.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:K,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(C,V){const K=Y.get(C);K.__webglFramebuffer=V,K.__useDefaultFramebuffer=V===void 0},this.setRenderTarget=function(C,V=0,K=0){N=C,G=V,U=K;let X=null,q=!1,Me=!1;if(C){const we=Y.get(C);if(we.__useDefaultFramebuffer!==void 0){M.bindFramebuffer(B.FRAMEBUFFER,we.__webglFramebuffer),Q.copy(C.viewport),te.copy(C.scissor),Oe=C.scissorTest,M.viewport(Q),M.scissor(te),M.setScissorTest(Oe),O=-1;return}else if(we.__webglFramebuffer===void 0)J.setupRenderTarget(C);else if(we.__hasExternalTextures)J.rebindTextures(C,Y.get(C.texture).__webglTexture,Y.get(C.depthTexture).__webglTexture);else if(C.depthBuffer){const Je=C.depthTexture;if(we.__boundDepthTexture!==Je){if(Je!==null&&Y.has(Je)&&(C.width!==Je.image.width||C.height!==Je.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");J.setupDepthRenderbuffer(C)}}const Be=C.texture;(Be.isData3DTexture||Be.isDataArrayTexture||Be.isCompressedArrayTexture)&&(Me=!0);const Ve=Y.get(C).__webglFramebuffer;C.isWebGLCubeRenderTarget?(Array.isArray(Ve[V])?X=Ve[V][K]:X=Ve[V],q=!0):C.samples>0&&J.useMultisampledRTT(C)===!1?X=Y.get(C).__webglMultisampledFramebuffer:Array.isArray(Ve)?X=Ve[K]:X=Ve,Q.copy(C.viewport),te.copy(C.scissor),Oe=C.scissorTest}else Q.copy(ye).multiplyScalar(re).floor(),te.copy(je).multiplyScalar(re).floor(),Oe=me;if(K!==0&&(X=z),M.bindFramebuffer(B.FRAMEBUFFER,X)&&M.drawBuffers(C,X),M.viewport(Q),M.scissor(te),M.setScissorTest(Oe),q){const we=Y.get(C.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+V,we.__webglTexture,K)}else if(Me){const we=V;for(let Be=0;Be<C.textures.length;Be++){const Ve=Y.get(C.textures[Be]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+Be,Ve.__webglTexture,K,we)}}else if(C!==null&&K!==0){const we=Y.get(C.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,we.__webglTexture,K)}O=-1},this.readRenderTargetPixels=function(C,V,K,X,q,Me,Ee,we=0){if(!(C&&C.isWebGLRenderTarget)){gt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Be=Y.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&Ee!==void 0&&(Be=Be[Ee]),Be){M.bindFramebuffer(B.FRAMEBUFFER,Be);try{const Ve=C.textures[we],Je=Ve.format,nt=Ve.type;if(C.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+we),!P.textureFormatReadable(Je)){gt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!P.textureTypeReadable(nt)){gt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}V>=0&&V<=C.width-X&&K>=0&&K<=C.height-q&&B.readPixels(V,K,X,q,xe.convert(Je),xe.convert(nt),Me)}finally{const Ve=N!==null?Y.get(N).__webglFramebuffer:null;M.bindFramebuffer(B.FRAMEBUFFER,Ve)}}},this.readRenderTargetPixelsAsync=async function(C,V,K,X,q,Me,Ee,we=0){if(!(C&&C.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Be=Y.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&Ee!==void 0&&(Be=Be[Ee]),Be)if(V>=0&&V<=C.width-X&&K>=0&&K<=C.height-q){M.bindFramebuffer(B.FRAMEBUFFER,Be);const Ve=C.textures[we],Je=Ve.format,nt=Ve.type;if(C.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+we),!P.textureFormatReadable(Je))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!P.textureTypeReadable(nt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const He=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,He),B.bufferData(B.PIXEL_PACK_BUFFER,Me.byteLength,B.STREAM_READ),B.readPixels(V,K,X,q,xe.convert(Je),xe.convert(nt),0);const Tt=N!==null?Y.get(N).__webglFramebuffer:null;M.bindFramebuffer(B.FRAMEBUFFER,Tt);const Jt=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await lC(B,Jt,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,He),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,Me),B.deleteBuffer(He),B.deleteSync(Jt),Me}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(C,V=null,K=0){const X=Math.pow(2,-K),q=Math.floor(C.image.width*X),Me=Math.floor(C.image.height*X),Ee=V!==null?V.x:0,we=V!==null?V.y:0;J.setTexture2D(C,0),B.copyTexSubImage2D(B.TEXTURE_2D,K,0,0,Ee,we,q,Me),M.unbindTexture()},this.copyTextureToTexture=function(C,V,K=null,X=null,q=0,Me=0){let Ee,we,Be,Ve,Je,nt,He,Tt,Jt;const $t=C.isCompressedTexture?C.mipmaps[Me]:C.image;if(K!==null)Ee=K.max.x-K.min.x,we=K.max.y-K.min.y,Be=K.isBox3?K.max.z-K.min.z:1,Ve=K.min.x,Je=K.min.y,nt=K.isBox3?K.min.z:0;else{const en=Math.pow(2,-q);Ee=Math.floor($t.width*en),we=Math.floor($t.height*en),C.isDataArrayTexture?Be=$t.depth:C.isData3DTexture?Be=Math.floor($t.depth*en):Be=1,Ve=0,Je=0,nt=0}X!==null?(He=X.x,Tt=X.y,Jt=X.z):(He=0,Tt=0,Jt=0);const At=xe.convert(V.format),Fn=xe.convert(V.type);let Pe;V.isData3DTexture?(J.setTexture3D(V,0),Pe=B.TEXTURE_3D):V.isDataArrayTexture||V.isCompressedArrayTexture?(J.setTexture2DArray(V,0),Pe=B.TEXTURE_2D_ARRAY):(J.setTexture2D(V,0),Pe=B.TEXTURE_2D),M.activeTexture(B.TEXTURE0),M.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,V.flipY),M.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,V.premultiplyAlpha),M.pixelStorei(B.UNPACK_ALIGNMENT,V.unpackAlignment);const Ei=M.getParameter(B.UNPACK_ROW_LENGTH),mt=M.getParameter(B.UNPACK_IMAGE_HEIGHT),Yi=M.getParameter(B.UNPACK_SKIP_PIXELS),Er=M.getParameter(B.UNPACK_SKIP_ROWS),Ms=M.getParameter(B.UNPACK_SKIP_IMAGES);M.pixelStorei(B.UNPACK_ROW_LENGTH,$t.width),M.pixelStorei(B.UNPACK_IMAGE_HEIGHT,$t.height),M.pixelStorei(B.UNPACK_SKIP_PIXELS,Ve),M.pixelStorei(B.UNPACK_SKIP_ROWS,Je),M.pixelStorei(B.UNPACK_SKIP_IMAGES,nt);const so=C.isDataArrayTexture||C.isData3DTexture,Ct=V.isDataArrayTexture||V.isData3DTexture;if(C.isDepthTexture){const en=Y.get(C),Es=Y.get(V),Lt=Y.get(en.__renderTarget),Ts=Y.get(Es.__renderTarget);M.bindFramebuffer(B.READ_FRAMEBUFFER,Lt.__webglFramebuffer),M.bindFramebuffer(B.DRAW_FRAMEBUFFER,Ts.__webglFramebuffer);for(let ao=0;ao<Be;ao++)so&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Y.get(C).__webglTexture,q,nt+ao),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Y.get(V).__webglTexture,Me,Jt+ao)),B.blitFramebuffer(Ve,Je,Ee,we,He,Tt,Ee,we,B.DEPTH_BUFFER_BIT,B.NEAREST);M.bindFramebuffer(B.READ_FRAMEBUFFER,null),M.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(q!==0||C.isRenderTargetTexture||Y.has(C)){const en=Y.get(C),Es=Y.get(V);M.bindFramebuffer(B.READ_FRAMEBUFFER,I),M.bindFramebuffer(B.DRAW_FRAMEBUFFER,F);for(let Lt=0;Lt<Be;Lt++)so?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,en.__webglTexture,q,nt+Lt):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,en.__webglTexture,q),Ct?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Es.__webglTexture,Me,Jt+Lt):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Es.__webglTexture,Me),q!==0?B.blitFramebuffer(Ve,Je,Ee,we,He,Tt,Ee,we,B.COLOR_BUFFER_BIT,B.NEAREST):Ct?B.copyTexSubImage3D(Pe,Me,He,Tt,Jt+Lt,Ve,Je,Ee,we):B.copyTexSubImage2D(Pe,Me,He,Tt,Ve,Je,Ee,we);M.bindFramebuffer(B.READ_FRAMEBUFFER,null),M.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else Ct?C.isDataTexture||C.isData3DTexture?B.texSubImage3D(Pe,Me,He,Tt,Jt,Ee,we,Be,At,Fn,$t.data):V.isCompressedArrayTexture?B.compressedTexSubImage3D(Pe,Me,He,Tt,Jt,Ee,we,Be,At,$t.data):B.texSubImage3D(Pe,Me,He,Tt,Jt,Ee,we,Be,At,Fn,$t):C.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,Me,He,Tt,Ee,we,At,Fn,$t.data):C.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,Me,He,Tt,$t.width,$t.height,At,$t.data):B.texSubImage2D(B.TEXTURE_2D,Me,He,Tt,Ee,we,At,Fn,$t);M.pixelStorei(B.UNPACK_ROW_LENGTH,Ei),M.pixelStorei(B.UNPACK_IMAGE_HEIGHT,mt),M.pixelStorei(B.UNPACK_SKIP_PIXELS,Yi),M.pixelStorei(B.UNPACK_SKIP_ROWS,Er),M.pixelStorei(B.UNPACK_SKIP_IMAGES,Ms),Me===0&&V.generateMipmaps&&B.generateMipmap(Pe),M.unbindTexture()},this.initRenderTarget=function(C){Y.get(C).__webglFramebuffer===void 0&&J.setupRenderTarget(C)},this.initTexture=function(C){C.isCubeTexture?J.setTextureCube(C,0):C.isData3DTexture?J.setTexture3D(C,0):C.isDataArrayTexture||C.isCompressedArrayTexture?J.setTexture2DArray(C,0):J.setTexture2D(C,0),M.unbindTexture()},this.resetState=function(){G=0,U=0,N=null,M.reset(),Se.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ir}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=ft._getDrawingBufferColorSpace(e),t.unpackColorSpace=ft._getUnpackColorSpace()}}const HP=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`,GP=`
precision highp float;

varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uBackgroundColor;
uniform float uCurvature;
uniform float uScanlineStrength;
uniform float uScanlineFrequency;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uBloom;
uniform float uBloomRadius;
uniform float uNoise;
uniform float uVignette;
uniform float uBrightness;
uniform float uPixelation;
uniform float uRgbShift;
uniform vec2 uPointer;
uniform float uMouseStrength;
uniform float uMouseReact;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 crtCurve(vec2 uv, float radius) {
  vec2 p = (uv - 0.5) * 2.0;
  float safeRadius = max(radius, 1.415);
  float cornerScale = safeRadius / sqrt(max(safeRadius * safeRadius - 2.0, 0.001));
  p = safeRadius * p / sqrt(max(safeRadius * safeRadius - dot(p, p), 0.001));
  p /= cornerScale;
  return p * 0.5 + 0.5;
}

float referencePlasma(vec2 uv, float t) {
  float frequencyScale = max(uWaveFrequency / 2.2, 0.001);
  uv = (uv - 0.5) * frequencyScale + 0.5;

  float scanline = 0.5 - 0.5 * cos(uv.y * 3.14159265 * uScanlineFrequency);
  scanline = mix(1.0, scanline, uScanlineStrength);

  uv *= vec2(80.0, 24.0);
  uv = ceil(uv);
  uv /= vec2(80.0, 24.0);

  float amplitude = uWaveAmplitude / 0.28;
  float field = 0.0;
  field += 0.7 * sin(0.5 * uv.x + t / 5.0);
  field += 3.0 * sin(1.6 * uv.y + t / 5.0);
  field += sin(10.0 * (uv.y * sin(t / 2.0) + uv.x * cos(t / 5.0)) + t / 2.0);

  float cx = uv.x + 0.5 * sin(t / 2.0);
  float cy = uv.y + 0.5 * cos(t / 4.0);
  field += 0.4 * sin(sqrt(100.0 * cx * cx + 100.0 * cy * cy + 1.0) + t);
  field += 0.9 * sin(sqrt(75.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  field -= 1.4 * sin(sqrt(256.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  field += 0.3 * sin(0.5 * uv.y + uv.x + sin(t));

  return scanline * floor(3.0 * (0.5 + 0.499 * sin(field * amplitude))) / 3.0;
}

void main() {
  vec2 uv = vUv;
  if (uPixelation > 1.001) {
    vec2 cells = max(uResolution / uPixelation, vec2(1.0));
    uv = (floor(uv * cells) + 0.5) / cells;
  }

  float curveRadius = 1.1 + 0.42 / max(uCurvature, 0.001);
  if (uMouseReact > 0.5) {
    curveRadius *= exp(-uPointer.y * uMouseStrength * 0.4);
  }
  vec2 curvedUv = crtCurve(uv, curveRadius);
  if (uMouseReact > 0.5) {
    curvedUv.x -= uPointer.x * uMouseStrength * 0.035;
  }

  float signal = referencePlasma(curvedUv, uTime);
  float radius = 0.01 * uBloomRadius;
  float glow = signal * 0.2;
  glow += referencePlasma(curvedUv + vec2(radius, 0.0), uTime) * 0.12;
  glow += referencePlasma(curvedUv - vec2(radius, 0.0), uTime) * 0.12;
  glow += referencePlasma(curvedUv + vec2(0.0, radius), uTime) * 0.12;
  glow += referencePlasma(curvedUv - vec2(0.0, radius), uTime) * 0.12;
  glow += referencePlasma(curvedUv + vec2(radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv - vec2(radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv + vec2(radius, -radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv + vec2(-radius, radius), uTime) * 0.08;

  float redSignal = referencePlasma(curvedUv + vec2(uRgbShift, 0.0), uTime);
  float blueSignal = referencePlasma(curvedUv - vec2(uRgbShift, 0.0), uTime);
  vec3 channelSignal = vec3(redSignal, signal, blueSignal);
  vec3 waveColor = uColor * (0.3 + signal * 0.7 + glow * uBloom * 0.65);
  waveColor += (channelSignal - signal) * 0.42;

  float edge = clamp(1.0 - dot(vUv - 0.5, vUv - 0.5) * 2.0, 0.0, 1.0);
  float edgeFade = mix(1.0, smoothstep(0.0, 1.0, edge), uVignette);
  float waveMask = clamp(signal * 0.82 + glow * 0.52, 0.0, 1.0) * edgeFade;

  float grain = hash21(gl_FragCoord.xy + vec2(fract(uTime) * 173.0));
  waveColor = max(waveColor * uBrightness, vec3(0.0));
  vec3 color = mix(uBackgroundColor, waveColor, waveMask);
  color += (grain - 0.5) * uNoise;
  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;function WP({color:n="#c755f7",backgroundColor:e="#05010a",speed:t=.5,curvature:i=.25,scanlineStrength:r=.25,scanlineFrequency:s=200,waveAmplitude:a=.3,waveFrequency:o=2.5,bloom:l=1.5,bloomRadius:u=1,noise:c=.1,vignette:d=0,brightness:f=1.25,pixelation:h=1,rgbShift:m=.015,mouseReact:_=!0,mouseStrength:g=.5,dpr:p=1,fps:v=30,paused:S=!1,className:x,style:E}){const T=Ye.useRef(null),w=Ye.useRef(null),y=Ye.useRef(null),A=Ye.useRef(null),R=Ye.useRef(S),D=Ye.useRef(new ht(0,0)),L=Ye.useRef(new ht(0,0)),z=Ye.useRef(!0),I=Ye.useRef(v),F=Ye.useRef(0);return Ye.useEffect(()=>{R.current=S},[S]),Ye.useEffect(()=>{I.current=Math.max(1,v)},[v]),Ye.useEffect(()=>{const G=T.current;if(!G)return;const U=new TC,N=new H0(-1,1,1,-1,0,1),O=new hc(2,2),b=new Sr({vertexShader:HP,fragmentShader:GP,uniforms:{uResolution:{value:new ht(1,1)},uTime:{value:0},uSpeed:{value:.5},uColor:{value:new vt("#c755f7")},uBackgroundColor:{value:new vt("#05010a")},uCurvature:{value:.25},uScanlineStrength:{value:.25},uScanlineFrequency:{value:200},uWaveAmplitude:{value:.3},uWaveFrequency:{value:2.5},uBloom:{value:1.5},uBloomRadius:{value:1},uNoise:{value:.1},uVignette:{value:0},uBrightness:{value:1.25},uPixelation:{value:1},uRgbShift:{value:.015},uPointer:{value:new ht(0,0)},uMouseStrength:{value:.5},uMouseReact:{value:1}}});w.current=b;const Q=new Wr(O,b);U.add(Q);const te=new VP({antialias:!1,alpha:!1,powerPreference:"low-power"});y.current=te,te.outputColorSpace=bi,te.setPixelRatio(Math.min(window.devicePixelRatio||1,1)),te.domElement.style.width="100%",te.domElement.style.height="100%",te.domElement.style.display="block",G.appendChild(te.domElement);const Oe=()=>{const De=Math.max(G.clientWidth,1),ye=Math.max(G.clientHeight,1);te.setSize(De,ye,!1),b.uniforms.uResolution.value.set(te.domElement.width,te.domElement.height)},be=new ResizeObserver(Oe);be.observe(G),Oe();const Ce=new XC,$=new IntersectionObserver(([De])=>{z.current=De.isIntersecting});$.observe(G);const se=De=>{if(A.current=requestAnimationFrame(se),!z.current||document.hidden)return;const ye=1e3/I.current;if(De-F.current<ye)return;F.current=De-(De-F.current)%ye;const je=Math.min(Ce.getDelta(),.1);R.current||(b.uniforms.uTime.value+=je*b.uniforms.uSpeed.value),L.current.lerp(D.current,.08),b.uniforms.uPointer.value.copy(L.current),te.render(U,N)};se(0);const re=De=>{const ye=G.getBoundingClientRect();D.current.set((De.clientX-ye.left)/Math.max(ye.width,1)*2-1,-((De.clientY-ye.top)/Math.max(ye.height,1)*2-1))},Ae=()=>D.current.set(0,0);return G.addEventListener("pointermove",re,{passive:!0}),G.addEventListener("pointerleave",Ae),()=>{cancelAnimationFrame(A.current),be.disconnect(),$.disconnect(),G.removeEventListener("pointermove",re),G.removeEventListener("pointerleave",Ae),O.dispose(),b.dispose(),te.dispose(),te.domElement.remove(),w.current=null,y.current=null}},[]),Ye.useEffect(()=>{const G=w.current,U=y.current;if(!G||!U)return;const N=G.uniforms;N.uColor.value.set(n),N.uBackgroundColor.value.set(e),N.uSpeed.value=t,N.uCurvature.value=i,N.uScanlineStrength.value=r,N.uScanlineFrequency.value=s,N.uWaveAmplitude.value=a,N.uWaveFrequency.value=o,N.uBloom.value=l,N.uBloomRadius.value=u,N.uNoise.value=c,N.uVignette.value=d,N.uBrightness.value=f,N.uPixelation.value=h,N.uRgbShift.value=m,N.uMouseReact.value=_?1:0,N.uMouseStrength.value=g,U.setPixelRatio(Math.min(window.devicePixelRatio||1,p));const O=T.current;O&&(U.setSize(Math.max(O.clientWidth,1),Math.max(O.clientHeight,1),!1),N.uResolution.value.set(U.domElement.width,U.domElement.height))},[e,l,u,f,n,i,p,_,g,c,h,m,s,r,t,v,d,a,o]),j.jsx("div",{ref:T,className:`crt-warp-container ${x||""}`,style:E})}function XP(){return j.jsxs("section",{className:"hero",id:"top",children:[j.jsxs("div",{className:"hero-intro","aria-hidden":"true",children:[j.jsx("div",{className:"hero-intro-panel top"}),j.jsx("div",{className:"hero-intro-brand",children:"FAKER.REN"}),j.jsx("div",{className:"hero-intro-panel bottom"})]}),j.jsx("div",{className:"hero-media",children:j.jsx(WP,{color:"#EC4899",backgroundColor:"#05010a",speed:.55,curvature:.25,scanlineStrength:.25,scanlineFrequency:200,waveAmplitude:.3,waveFrequency:2.5,bloom:1.5,bloomRadius:1,noise:.1,vignette:0,brightness:1.25,pixelation:1,rgbShift:.015,mouseReact:!0,mouseStrength:.5,dpr:1,fps:30,paused:!1})}),j.jsx("div",{className:"hero-shade","aria-hidden":"true"}),j.jsx("div",{className:"hero-grid","aria-hidden":"true"}),j.jsxs("div",{className:"hero-inner wrap",children:[j.jsxs("p",{className:"hero-kicker",children:[j.jsx("span",{className:"dot"}),cn.role]}),j.jsxs("h1",{className:"hero-title",children:[j.jsx("span",{className:"hero-line",children:j.jsx("span",{className:"hero-line-inner solid",children:cn.name})}),j.jsx("span",{className:"hero-line",children:j.jsx("span",{className:"hero-line-inner hollow accent",children:cn.nameTail})})]}),j.jsx("p",{className:"hero-sub",children:cn.heroSub}),j.jsxs("div",{className:"hero-cta",children:[j.jsx("a",{className:"btn btn-primary",href:"#contact",children:"联系我"}),j.jsx("a",{className:"btn btn-ghost",href:"#projects",children:"查看项目 ↓"})]})]}),j.jsxs("div",{className:"hero-scroll",children:[j.jsx("span",{className:"line"}),"SCROLL"]})]})}function Qr(n){if(n===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return n}function SM(n,e){n.prototype=Object.create(e.prototype),n.prototype.constructor=n,n.__proto__=e}/*!
 * GSAP 3.15.0
 * https://gsap.com
 *
 * @license Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var Bi={autoSleep:120,force3D:"auto",nullTargetWarn:1,units:{lineHeight:""}},Ku={duration:.5,overwrite:!1,delay:0},G0,Nn,Bt,tr=1e8,bt=1/tr,fg=Math.PI*2,YP=fg/4,qP=0,MM=Math.sqrt,$P=Math.cos,KP=Math.sin,Rn=function(e){return typeof e=="string"},jt=function(e){return typeof e=="function"},vs=function(e){return typeof e=="number"},W0=function(e){return typeof e>"u"},Xr=function(e){return typeof e=="object"},vi=function(e){return e!==!1},X0=function(){return typeof window<"u"},nf=function(e){return jt(e)||Rn(e)},EM=typeof ArrayBuffer=="function"&&ArrayBuffer.isView||function(){},qn=Array.isArray,ZP=/random\([^)]+\)/g,jP=/,\s*/g,bx=/(?:-?\.?\d|\.)+/gi,TM=/[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,Ho=/[-+=.]*\d+[.e-]*\d*[a-z%]*/g,up=/[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,wM=/[+-]=-?[.\d]+/,QP=/[^,'"\[\]\s]+/gi,JP=/^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,Ht,Rr,dg,Y0,Vi={},xd={},AM,CM=function(e){return(xd=vl(e,Vi))&&Mi},q0=function(e,t){return console.warn("Invalid property",e,"set to",t,"Missing plugin? gsap.registerPlugin()")},Zu=function(e,t){return!t&&console.warn(e)},RM=function(e,t){return e&&(Vi[e]=t)&&xd&&(xd[e]=t)||Vi},ju=function(){return 0},eD={suppressEvents:!0,isStart:!0,kill:!1},If={suppressEvents:!0,kill:!1},tD={suppressEvents:!0},$0={},ea=[],hg={},bM,Pi={},cp={},Px=30,Uf=[],K0="",Z0=function(e){var t=e[0],i,r;if(Xr(t)||jt(t)||(e=[e]),!(i=(t._gsap||{}).harness)){for(r=Uf.length;r--&&!Uf[r].targetTest(t););i=Uf[r]}for(r=e.length;r--;)e[r]&&(e[r]._gsap||(e[r]._gsap=new jM(e[r],i)))||e.splice(r,1);return e},Oa=function(e){return e._gsap||Z0(nr(e))[0]._gsap},PM=function(e,t,i){return(i=e[t])&&jt(i)?e[t]():W0(i)&&e.getAttribute&&e.getAttribute(t)||i},xi=function(e,t){return(e=e.split(",")).forEach(t)||e},tn=function(e){return Math.round(e*1e5)/1e5||0},zt=function(e){return Math.round(e*1e7)/1e7||0},el=function(e,t){var i=t.charAt(0),r=parseFloat(t.substr(2));return e=parseFloat(e),i==="+"?e+r:i==="-"?e-r:i==="*"?e*r:e/r},nD=function(e,t){for(var i=t.length,r=0;e.indexOf(t[r])<0&&++r<i;);return r<i},yd=function(){var e=ea.length,t=ea.slice(0),i,r;for(hg={},ea.length=0,i=0;i<e;i++)r=t[i],r&&r._lazy&&(r.render(r._lazy[0],r._lazy[1],!0)._lazy=0)},j0=function(e){return!!(e._initted||e._startAt||e.add)},DM=function(e,t,i,r){ea.length&&!Nn&&yd(),e.render(t,i,!!(Nn&&t<0&&j0(e))),ea.length&&!Nn&&yd()},LM=function(e){var t=parseFloat(e);return(t||t===0)&&(e+"").match(QP).length<2?t:Rn(e)?e.trim():e},NM=function(e){return e},Hi=function(e,t){for(var i in t)i in e||(e[i]=t[i]);return e},iD=function(e){return function(t,i){for(var r in i)r in t||r==="duration"&&e||r==="ease"||(t[r]=i[r])}},vl=function(e,t){for(var i in t)e[i]=t[i];return e},Dx=function n(e,t){for(var i in t)i!=="__proto__"&&i!=="constructor"&&i!=="prototype"&&(e[i]=Xr(t[i])?n(e[i]||(e[i]={}),t[i]):t[i]);return e},Sd=function(e,t){var i={},r;for(r in e)r in t||(i[r]=e[r]);return i},gu=function(e){var t=e.parent||Ht,i=e.keyframes?iD(qn(e.keyframes)):Hi;if(vi(e.inherit))for(;t;)i(e,t.vars.defaults),t=t.parent||t._dp;return e},rD=function(e,t){for(var i=e.length,r=i===t.length;r&&i--&&e[i]===t[i];);return i<0},IM=function(e,t,i,r,s){var a=e[r],o;if(s)for(o=t[s];a&&a[s]>o;)a=a._prev;return a?(t._next=a._next,a._next=t):(t._next=e[i],e[i]=t),t._next?t._next._prev=t:e[r]=t,t._prev=a,t.parent=t._dp=e,t},Qd=function(e,t,i,r){i===void 0&&(i="_first"),r===void 0&&(r="_last");var s=t._prev,a=t._next;s?s._next=a:e[i]===t&&(e[i]=a),a?a._prev=s:e[r]===t&&(e[r]=s),t._next=t._prev=t.parent=null},aa=function(e,t){e.parent&&(!t||e.parent.autoRemoveChildren)&&e.parent.remove&&e.parent.remove(e),e._act=0},ka=function(e,t){if(e&&(!t||t._end>e._dur||t._start<0))for(var i=e;i;)i._dirty=1,i=i.parent;return e},sD=function(e){for(var t=e.parent;t&&t.parent;)t._dirty=1,t.totalDuration(),t=t.parent;return e},pg=function(e,t,i,r){return e._startAt&&(Nn?e._startAt.revert(If):e.vars.immediateRender&&!e.vars.autoRevert||e._startAt.render(t,!0,r))},aD=function n(e){return!e||e._ts&&n(e.parent)},Lx=function(e){return e._repeat?xl(e._tTime,e=e.duration()+e._rDelay)*e:0},xl=function(e,t){var i=Math.floor(e=zt(e/t));return e&&i===e?i-1:i},Md=function(e,t){return(e-t._start)*t._ts+(t._ts>=0?0:t._dirty?t.totalDuration():t._tDur)},Jd=function(e){return e._end=zt(e._start+(e._tDur/Math.abs(e._ts||e._rts||bt)||0))},eh=function(e,t){var i=e._dp;return i&&i.smoothChildTiming&&e._ts&&(e._start=zt(i._time-(e._ts>0?t/e._ts:((e._dirty?e.totalDuration():e._tDur)-t)/-e._ts)),Jd(e),i._dirty||ka(i,e)),e},UM=function(e,t){var i;if((t._time||!t._dur&&t._initted||t._start<e._time&&(t._dur||!t.add))&&(i=Md(e.rawTime(),t),(!t._dur||pc(0,t.totalDuration(),i)-t._tTime>bt)&&t.render(i,!0)),ka(e,t)._dp&&e._initted&&e._time>=e._dur&&e._ts){if(e._dur<e.duration())for(i=e;i._dp;)i.rawTime()>=0&&i.totalTime(i._tTime),i=i._dp;e._zTime=-bt}},Lr=function(e,t,i,r){return t.parent&&aa(t),t._start=zt((vs(i)?i:i||e!==Ht?$i(e,i,t):e._time)+t._delay),t._end=zt(t._start+(t.totalDuration()/Math.abs(t.timeScale())||0)),IM(e,t,"_first","_last",e._sort?"_start":0),mg(t)||(e._recent=t),r||UM(e,t),e._ts<0&&eh(e,e._tTime),e},FM=function(e,t){return(Vi.ScrollTrigger||q0("scrollTrigger",t))&&Vi.ScrollTrigger.create(t,e)},OM=function(e,t,i,r,s){if(J0(e,t,s),!e._initted)return 1;if(!i&&e._pt&&!Nn&&(e._dur&&e.vars.lazy!==!1||!e._dur&&e.vars.lazy)&&bM!==Li.frame)return ea.push(e),e._lazy=[s,r],1},oD=function n(e){var t=e.parent;return t&&t._ts&&t._initted&&!t._lock&&(t.rawTime()<0||n(t))},mg=function(e){var t=e.data;return t==="isFromStart"||t==="isStart"},lD=function(e,t,i,r){var s=e.ratio,a=t<0||!t&&(!e._start&&oD(e)&&!(!e._initted&&mg(e))||(e._ts<0||e._dp._ts<0)&&!mg(e))?0:1,o=e._rDelay,l=0,u,c,d;if(o&&e._repeat&&(l=pc(0,e._tDur,t),c=xl(l,o),e._yoyo&&c&1&&(a=1-a),c!==xl(e._tTime,o)&&(s=1-a,e.vars.repeatRefresh&&e._initted&&e.invalidate())),a!==s||Nn||r||e._zTime===bt||!t&&e._zTime){if(!e._initted&&OM(e,t,r,i,l))return;for(d=e._zTime,e._zTime=t||(i?bt:0),i||(i=t&&!d),e.ratio=a,e._from&&(a=1-a),e._time=0,e._tTime=l,u=e._pt;u;)u.r(a,u.d),u=u._next;t<0&&pg(e,t,i,!0),e._onUpdate&&!i&&Ui(e,"onUpdate"),l&&e._repeat&&!i&&e.parent&&Ui(e,"onRepeat"),(t>=e._tDur||t<0)&&e.ratio===a&&(a&&aa(e,1),!i&&!Nn&&(Ui(e,a?"onComplete":"onReverseComplete",!0),e._prom&&e._prom()))}else e._zTime||(e._zTime=t)},uD=function(e,t,i){var r;if(i>t)for(r=e._first;r&&r._start<=i;){if(r.data==="isPause"&&r._start>t)return r;r=r._next}else for(r=e._last;r&&r._start>=i;){if(r.data==="isPause"&&r._start<t)return r;r=r._prev}},yl=function(e,t,i,r){var s=e._repeat,a=zt(t)||0,o=e._tTime/e._tDur;return o&&!r&&(e._time*=a/e._dur),e._dur=a,e._tDur=s?s<0?1e10:zt(a*(s+1)+e._rDelay*s):a,o>0&&!r&&eh(e,e._tTime=e._tDur*o),e.parent&&Jd(e),i||ka(e.parent,e),e},Nx=function(e){return e instanceof di?ka(e):yl(e,e._dur)},cD={_start:0,endTime:ju,totalDuration:ju},$i=function n(e,t,i){var r=e.labels,s=e._recent||cD,a=e.duration()>=tr?s.endTime(!1):e._dur,o,l,u;return Rn(t)&&(isNaN(t)||t in r)?(l=t.charAt(0),u=t.substr(-1)==="%",o=t.indexOf("="),l==="<"||l===">"?(o>=0&&(t=t.replace(/=/,"")),(l==="<"?s._start:s.endTime(s._repeat>=0))+(parseFloat(t.substr(1))||0)*(u?(o<0?s:i).totalDuration()/100:1)):o<0?(t in r||(r[t]=a),r[t]):(l=parseFloat(t.charAt(o-1)+t.substr(o+1)),u&&i&&(l=l/100*(qn(i)?i[0]:i).totalDuration()),o>1?n(e,t.substr(0,o-1),i)+l:a+l)):t==null?a:+t},_u=function(e,t,i){var r=vs(t[1]),s=(r?2:1)+(e<2?0:1),a=t[s],o,l;if(r&&(a.duration=t[1]),a.parent=i,e){for(o=a,l=i;l&&!("immediateRender"in o);)o=l.vars.defaults||{},l=vi(l.vars.inherit)&&l.parent;a.immediateRender=vi(o.immediateRender),e<2?a.runBackwards=1:a.startAt=t[s-1]}return new fn(t[0],a,t[s+1])},ha=function(e,t){return e||e===0?t(e):t},pc=function(e,t,i){return i<e?e:i>t?t:i},Wn=function(e,t){return!Rn(e)||!(t=JP.exec(e))?"":t[1]},fD=function(e,t,i){return ha(i,function(r){return pc(e,t,r)})},gg=[].slice,kM=function(e,t){return e&&Xr(e)&&"length"in e&&(!t&&!e.length||e.length-1 in e&&Xr(e[0]))&&!e.nodeType&&e!==Rr},dD=function(e,t,i){return i===void 0&&(i=[]),e.forEach(function(r){var s;return Rn(r)&&!t||kM(r,1)?(s=i).push.apply(s,nr(r)):i.push(r)})||i},nr=function(e,t,i){return Bt&&!t&&Bt.selector?Bt.selector(e):Rn(e)&&!i&&(dg||!Sl())?gg.call((t||Y0).querySelectorAll(e),0):qn(e)?dD(e,i):kM(e)?gg.call(e,0):e?[e]:[]},_g=function(e){return e=nr(e)[0]||Zu("Invalid scope")||{},function(t){var i=e.current||e.nativeElement||e;return nr(t,i.querySelectorAll?i:i===e?Zu("Invalid scope")||Y0.createElement("div"):e)}},BM=function(e){return e.sort(function(){return .5-Math.random()})},zM=function(e){if(jt(e))return e;var t=Xr(e)?e:{each:e},i=Ba(t.ease),r=t.from||0,s=parseFloat(t.base)||0,a={},o=r>0&&r<1,l=isNaN(r)||o,u=t.axis,c=r,d=r;return Rn(r)?c=d={center:.5,edges:.5,end:1}[r]||0:!o&&l&&(c=r[0],d=r[1]),function(f,h,m){var _=(m||t).length,g=a[_],p,v,S,x,E,T,w,y,A;if(!g){if(A=t.grid==="auto"?0:(t.grid||[1,tr])[1],!A){for(w=-tr;w<(w=m[A++].getBoundingClientRect().left)&&A<_;);A<_&&A--}for(g=a[_]=[],p=l?Math.min(A,_)*c-.5:r%A,v=A===tr?0:l?_*d/A-.5:r/A|0,w=0,y=tr,T=0;T<_;T++)S=T%A-p,x=v-(T/A|0),g[T]=E=u?Math.abs(u==="y"?x:S):MM(S*S+x*x),E>w&&(w=E),E<y&&(y=E);r==="random"&&BM(g),g.max=w-y,g.min=y,g.v=_=(parseFloat(t.amount)||parseFloat(t.each)*(A>_?_-1:u?u==="y"?_/A:A:Math.max(A,_/A))||0)*(r==="edges"?-1:1),g.b=_<0?s-_:s,g.u=Wn(t.amount||t.each)||0,i=i&&_<0?wD(i):i}return _=(g[f]-g.min)/g.max||0,zt(g.b+(i?i(_):_)*g.v)+g.u}},vg=function(e){var t=Math.pow(10,((e+"").split(".")[1]||"").length);return function(i){var r=zt(Math.round(parseFloat(i)/e)*e*t);return(r-r%1)/t+(vs(i)?0:Wn(i))}},VM=function(e,t){var i=qn(e),r,s;return!i&&Xr(e)&&(r=i=e.radius||tr,e.values?(e=nr(e.values),(s=!vs(e[0]))&&(r*=r)):e=vg(e.increment)),ha(t,i?jt(e)?function(a){return s=e(a),Math.abs(s-a)<=r?s:a}:function(a){for(var o=parseFloat(s?a.x:a),l=parseFloat(s?a.y:0),u=tr,c=0,d=e.length,f,h;d--;)s?(f=e[d].x-o,h=e[d].y-l,f=f*f+h*h):f=Math.abs(e[d]-o),f<u&&(u=f,c=d);return c=!r||u<=r?e[c]:a,s||c===a||vs(a)?c:c+Wn(a)}:vg(e))},HM=function(e,t,i,r){return ha(qn(e)?!t:i===!0?!!(i=0):!r,function(){return qn(e)?e[~~(Math.random()*e.length)]:(i=i||1e-5)&&(r=i<1?Math.pow(10,(i+"").length-2):1)&&Math.floor(Math.round((e-i/2+Math.random()*(t-e+i*.99))/i)*i*r)/r})},hD=function(){for(var e=arguments.length,t=new Array(e),i=0;i<e;i++)t[i]=arguments[i];return function(r){return t.reduce(function(s,a){return a(s)},r)}},pD=function(e,t){return function(i){return e(parseFloat(i))+(t||Wn(i))}},mD=function(e,t,i){return WM(e,t,0,1,i)},GM=function(e,t,i){return ha(i,function(r){return e[~~t(r)]})},gD=function n(e,t,i){var r=t-e;return qn(e)?GM(e,n(0,e.length),t):ha(i,function(s){return(r+(s-e)%r)%r+e})},_D=function n(e,t,i){var r=t-e,s=r*2;return qn(e)?GM(e,n(0,e.length-1),t):ha(i,function(a){return a=(s+(a-e)%s)%s||0,e+(a>r?s-a:a)})},Qu=function(e){return e.replace(ZP,function(t){var i=t.indexOf("[")+1,r=t.substring(i||7,i?t.indexOf("]"):t.length-1).split(jP);return HM(i?r:+r[0],i?0:+r[1],+r[2]||1e-5)})},WM=function(e,t,i,r,s){var a=t-e,o=r-i;return ha(s,function(l){return i+((l-e)/a*o||0)})},vD=function n(e,t,i,r){var s=isNaN(e+t)?0:function(h){return(1-h)*e+h*t};if(!s){var a=Rn(e),o={},l,u,c,d,f;if(i===!0&&(r=1)&&(i=null),a)e={p:e},t={p:t};else if(qn(e)&&!qn(t)){for(c=[],d=e.length,f=d-2,u=1;u<d;u++)c.push(n(e[u-1],e[u]));d--,s=function(m){m*=d;var _=Math.min(f,~~m);return c[_](m-_)},i=t}else r||(e=vl(qn(e)?[]:{},e));if(!c){for(l in t)Q0.call(o,e,l,"get",t[l]);s=function(m){return n_(m,o)||(a?e.p:e)}}}return ha(i,s)},Ix=function(e,t,i){var r=e.labels,s=tr,a,o,l;for(a in r)o=r[a]-t,o<0==!!i&&o&&s>(o=Math.abs(o))&&(l=a,s=o);return l},Ui=function(e,t,i){var r=e.vars,s=r[t],a=Bt,o=e._ctx,l,u,c;if(s)return l=r[t+"Params"],u=r.callbackScope||e,i&&ea.length&&yd(),o&&(Bt=o),c=l?s.apply(u,l):s.call(u),Bt=a,c},eu=function(e){return aa(e),e.scrollTrigger&&e.scrollTrigger.kill(!!Nn),e.progress()<1&&Ui(e,"onInterrupt"),e},Go,XM=[],YM=function(e){if(e)if(e=!e.name&&e.default||e,X0()||e.headless){var t=e.name,i=jt(e),r=t&&!i&&e.init?function(){this._props=[]}:e,s={init:ju,render:n_,add:Q0,kill:UD,modifier:ID,rawVars:0},a={targetTest:0,get:0,getSetter:t_,aliases:{},register:0};if(Sl(),e!==r){if(Pi[t])return;Hi(r,Hi(Sd(e,s),a)),vl(r.prototype,vl(s,Sd(e,a))),Pi[r.prop=t]=r,e.targetTest&&(Uf.push(r),$0[t]=1),t=(t==="css"?"CSS":t.charAt(0).toUpperCase()+t.substr(1))+"Plugin"}RM(t,r),e.register&&e.register(Mi,r,yi)}else XM.push(e)},Rt=255,tu={aqua:[0,Rt,Rt],lime:[0,Rt,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,Rt],navy:[0,0,128],white:[Rt,Rt,Rt],olive:[128,128,0],yellow:[Rt,Rt,0],orange:[Rt,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[Rt,0,0],pink:[Rt,192,203],cyan:[0,Rt,Rt],transparent:[Rt,Rt,Rt,0]},fp=function(e,t,i){return e+=e<0?1:e>1?-1:0,(e*6<1?t+(i-t)*e*6:e<.5?i:e*3<2?t+(i-t)*(2/3-e)*6:t)*Rt+.5|0},qM=function(e,t,i){var r=e?vs(e)?[e>>16,e>>8&Rt,e&Rt]:0:tu.black,s,a,o,l,u,c,d,f,h,m;if(!r){if(e.substr(-1)===","&&(e=e.substr(0,e.length-1)),tu[e])r=tu[e];else if(e.charAt(0)==="#"){if(e.length<6&&(s=e.charAt(1),a=e.charAt(2),o=e.charAt(3),e="#"+s+s+a+a+o+o+(e.length===5?e.charAt(4)+e.charAt(4):"")),e.length===9)return r=parseInt(e.substr(1,6),16),[r>>16,r>>8&Rt,r&Rt,parseInt(e.substr(7),16)/255];e=parseInt(e.substr(1),16),r=[e>>16,e>>8&Rt,e&Rt]}else if(e.substr(0,3)==="hsl"){if(r=m=e.match(bx),!t)l=+r[0]%360/360,u=+r[1]/100,c=+r[2]/100,a=c<=.5?c*(u+1):c+u-c*u,s=c*2-a,r.length>3&&(r[3]*=1),r[0]=fp(l+1/3,s,a),r[1]=fp(l,s,a),r[2]=fp(l-1/3,s,a);else if(~e.indexOf("="))return r=e.match(TM),i&&r.length<4&&(r[3]=1),r}else r=e.match(bx)||tu.transparent;r=r.map(Number)}return t&&!m&&(s=r[0]/Rt,a=r[1]/Rt,o=r[2]/Rt,d=Math.max(s,a,o),f=Math.min(s,a,o),c=(d+f)/2,d===f?l=u=0:(h=d-f,u=c>.5?h/(2-d-f):h/(d+f),l=d===s?(a-o)/h+(a<o?6:0):d===a?(o-s)/h+2:(s-a)/h+4,l*=60),r[0]=~~(l+.5),r[1]=~~(u*100+.5),r[2]=~~(c*100+.5)),i&&r.length<4&&(r[3]=1),r},$M=function(e){var t=[],i=[],r=-1;return e.split(ta).forEach(function(s){var a=s.match(Ho)||[];t.push.apply(t,a),i.push(r+=a.length+1)}),t.c=i,t},Ux=function(e,t,i){var r="",s=(e+r).match(ta),a=t?"hsla(":"rgba(",o=0,l,u,c,d;if(!s)return e;if(s=s.map(function(f){return(f=qM(f,t,1))&&a+(t?f[0]+","+f[1]+"%,"+f[2]+"%,"+f[3]:f.join(","))+")"}),i&&(c=$M(e),l=i.c,l.join(r)!==c.c.join(r)))for(u=e.replace(ta,"1").split(Ho),d=u.length-1;o<d;o++)r+=u[o]+(~l.indexOf(o)?s.shift()||a+"0,0,0,0)":(c.length?c:s.length?s:i).shift());if(!u)for(u=e.split(ta),d=u.length-1;o<d;o++)r+=u[o]+s[o];return r+u[d]},ta=function(){var n="(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b",e;for(e in tu)n+="|"+e+"\\b";return new RegExp(n+")","gi")}(),xD=/hsl[a]?\(/,KM=function(e){var t=e.join(" "),i;if(ta.lastIndex=0,ta.test(t))return i=xD.test(t),e[1]=Ux(e[1],i),e[0]=Ux(e[0],i,$M(e[1])),!0},Ju,Li=function(){var n=Date.now,e=500,t=33,i=n(),r=i,s=1e3/240,a=s,o=[],l,u,c,d,f,h,m=function _(g){var p=n()-r,v=g===!0,S,x,E,T;if((p>e||p<0)&&(i+=p-t),r+=p,E=r-i,S=E-a,(S>0||v)&&(T=++d.frame,f=E-d.time*1e3,d.time=E=E/1e3,a+=S+(S>=s?4:s-S),x=1),v||(l=u(_)),x)for(h=0;h<o.length;h++)o[h](E,f,T,g)};return d={time:0,frame:0,tick:function(){m(!0)},deltaRatio:function(g){return f/(1e3/(g||60))},wake:function(){AM&&(!dg&&X0()&&(Rr=dg=window,Y0=Rr.document||{},Vi.gsap=Mi,(Rr.gsapVersions||(Rr.gsapVersions=[])).push(Mi.version),CM(xd||Rr.GreenSockGlobals||!Rr.gsap&&Rr||{}),XM.forEach(YM)),c=typeof requestAnimationFrame<"u"&&requestAnimationFrame,l&&d.sleep(),u=c||function(g){return setTimeout(g,a-d.time*1e3+1|0)},Ju=1,m(2))},sleep:function(){(c?cancelAnimationFrame:clearTimeout)(l),Ju=0,u=ju},lagSmoothing:function(g,p){e=g||1/0,t=Math.min(p||33,e)},fps:function(g){s=1e3/(g||240),a=d.time*1e3+s},add:function(g,p,v){var S=p?function(x,E,T,w){g(x,E,T,w),d.remove(S)}:g;return d.remove(g),o[v?"unshift":"push"](S),Sl(),S},remove:function(g,p){~(p=o.indexOf(g))&&o.splice(p,1)&&h>=p&&h--},_listeners:o},d}(),Sl=function(){return!Ju&&Li.wake()},pt={},yD=/^[\d.\-M][\d.\-,\s]/,SD=/["']/g,MD=function(e){for(var t={},i=e.substr(1,e.length-3).split(":"),r=i[0],s=1,a=i.length,o,l,u;s<a;s++)l=i[s],o=s!==a-1?l.lastIndexOf(","):l.length,u=l.substr(0,o),t[r]=isNaN(u)?u.replace(SD,"").trim():+u,r=l.substr(o+1).trim();return t},ED=function(e){var t=e.indexOf("(")+1,i=e.indexOf(")"),r=e.indexOf("(",t);return e.substring(t,~r&&r<i?e.indexOf(")",i+1):i)},TD=function(e){var t=(e+"").split("("),i=pt[t[0]];return i&&t.length>1&&i.config?i.config.apply(null,~e.indexOf("{")?[MD(t[1])]:ED(e).split(",").map(LM)):pt._CE&&yD.test(e)?pt._CE("",e):i},wD=function(e){return function(t){return 1-e(1-t)}},Ba=function(e,t){return e&&(jt(e)?e:pt[e]||TD(e))||t},io=function(e,t,i,r){i===void 0&&(i=function(l){return 1-t(1-l)}),r===void 0&&(r=function(l){return l<.5?t(l*2)/2:1-t((1-l)*2)/2});var s={easeIn:t,easeOut:i,easeInOut:r},a;return xi(e,function(o){pt[o]=Vi[o]=s,pt[a=o.toLowerCase()]=i;for(var l in s)pt[a+(l==="easeIn"?".in":l==="easeOut"?".out":".inOut")]=pt[o+"."+l]=s[l]}),s},ZM=function(e){return function(t){return t<.5?(1-e(1-t*2))/2:.5+e((t-.5)*2)/2}},dp=function n(e,t,i){var r=t>=1?t:1,s=(i||(e?.3:.45))/(t<1?t:1),a=s/fg*(Math.asin(1/r)||0),o=function(c){return c===1?1:r*Math.pow(2,-10*c)*KP((c-a)*s)+1},l=e==="out"?o:e==="in"?function(u){return 1-o(1-u)}:ZM(o);return s=fg/s,l.config=function(u,c){return n(e,u,c)},l},hp=function n(e,t){t===void 0&&(t=1.70158);var i=function(a){return a?--a*a*((t+1)*a+t)+1:0},r=e==="out"?i:e==="in"?function(s){return 1-i(1-s)}:ZM(i);return r.config=function(s){return n(e,s)},r};xi("Linear,Quad,Cubic,Quart,Quint,Strong",function(n,e){var t=e<5?e+1:e;io(n+",Power"+(t-1),e?function(i){return Math.pow(i,t)}:function(i){return i},function(i){return 1-Math.pow(1-i,t)},function(i){return i<.5?Math.pow(i*2,t)/2:1-Math.pow((1-i)*2,t)/2})});pt.Linear.easeNone=pt.none=pt.Linear.easeIn;io("Elastic",dp("in"),dp("out"),dp());(function(n,e){var t=1/e,i=2*t,r=2.5*t,s=function(o){return o<t?n*o*o:o<i?n*Math.pow(o-1.5/e,2)+.75:o<r?n*(o-=2.25/e)*o+.9375:n*Math.pow(o-2.625/e,2)+.984375};io("Bounce",function(a){return 1-s(1-a)},s)})(7.5625,2.75);io("Expo",function(n){return Math.pow(2,10*(n-1))*n+n*n*n*n*n*n*(1-n)});io("Circ",function(n){return-(MM(1-n*n)-1)});io("Sine",function(n){return n===1?1:-$P(n*YP)+1});io("Back",hp("in"),hp("out"),hp());pt.SteppedEase=pt.steps=Vi.SteppedEase={config:function(e,t){e===void 0&&(e=1);var i=1/e,r=e+(t?0:1),s=t?1:0,a=1-bt;return function(o){return((r*pc(0,a,o)|0)+s)*i}}};Ku.ease=pt["quad.out"];xi("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt",function(n){return K0+=n+","+n+"Params,"});var jM=function(e,t){this.id=qP++,e._gsap=this,this.target=e,this.harness=t,this.get=t?t.get:PM,this.set=t?t.getSetter:t_},ec=function(){function n(t){this.vars=t,this._delay=+t.delay||0,(this._repeat=t.repeat===1/0?-2:t.repeat||0)&&(this._rDelay=t.repeatDelay||0,this._yoyo=!!t.yoyo||!!t.yoyoEase),this._ts=1,yl(this,+t.duration,1,1),this.data=t.data,Bt&&(this._ctx=Bt,Bt.data.push(this)),Ju||Li.wake()}var e=n.prototype;return e.delay=function(i){return i||i===0?(this.parent&&this.parent.smoothChildTiming&&this.startTime(this._start+i-this._delay),this._delay=i,this):this._delay},e.duration=function(i){return arguments.length?this.totalDuration(this._repeat>0?i+(i+this._rDelay)*this._repeat:i):this.totalDuration()&&this._dur},e.totalDuration=function(i){return arguments.length?(this._dirty=0,yl(this,this._repeat<0?i:(i-this._repeat*this._rDelay)/(this._repeat+1))):this._tDur},e.totalTime=function(i,r){if(Sl(),!arguments.length)return this._tTime;var s=this._dp;if(s&&s.smoothChildTiming&&this._ts){for(eh(this,i),!s._dp||s.parent||UM(s,this);s&&s.parent;)s.parent._time!==s._start+(s._ts>=0?s._tTime/s._ts:(s.totalDuration()-s._tTime)/-s._ts)&&s.totalTime(s._tTime,!0),s=s.parent;!this.parent&&this._dp.autoRemoveChildren&&(this._ts>0&&i<this._tDur||this._ts<0&&i>0||!this._tDur&&!i)&&Lr(this._dp,this,this._start-this._delay)}return(this._tTime!==i||!this._dur&&!r||this._initted&&Math.abs(this._zTime)===bt||!this._initted&&this._dur&&i||!i&&!this._initted&&(this.add||this._ptLookup))&&(this._ts||(this._pTime=i),DM(this,i,r)),this},e.time=function(i,r){return arguments.length?this.totalTime(Math.min(this.totalDuration(),i+Lx(this))%(this._dur+this._rDelay)||(i?this._dur:0),r):this._time},e.totalProgress=function(i,r){return arguments.length?this.totalTime(this.totalDuration()*i,r):this.totalDuration()?Math.min(1,this._tTime/this._tDur):this.rawTime()>=0&&this._initted?1:0},e.progress=function(i,r){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&!(this.iteration()&1)?1-i:i)+Lx(this),r):this.duration()?Math.min(1,this._time/this._dur):this.rawTime()>0?1:0},e.iteration=function(i,r){var s=this.duration()+this._rDelay;return arguments.length?this.totalTime(this._time+(i-1)*s,r):this._repeat?xl(this._tTime,s)+1:1},e.timeScale=function(i,r){if(!arguments.length)return this._rts===-bt?0:this._rts;if(this._rts===i)return this;var s=this.parent&&this._ts?Md(this.parent._time,this):this._tTime;return this._rts=+i||0,this._ts=this._ps||i===-bt?0:this._rts,this.totalTime(pc(-Math.abs(this._delay),this.totalDuration(),s),r!==!1),Jd(this),sD(this)},e.paused=function(i){return arguments.length?(this._ps!==i&&(this._ps=i,i?(this._pTime=this._tTime||Math.max(-this._delay,this.rawTime()),this._ts=this._act=0):(Sl(),this._ts=this._rts,this.totalTime(this.parent&&!this.parent.smoothChildTiming?this.rawTime():this._tTime||this._pTime,this.progress()===1&&Math.abs(this._zTime)!==bt&&(this._tTime-=bt)))),this):this._ps},e.startTime=function(i){if(arguments.length){this._start=zt(i);var r=this.parent||this._dp;return r&&(r._sort||!this.parent)&&Lr(r,this,this._start-this._delay),this}return this._start},e.endTime=function(i){return this._start+(vi(i)?this.totalDuration():this.duration())/Math.abs(this._ts||1)},e.rawTime=function(i){var r=this.parent||this._dp;return r?i&&(!this._ts||this._repeat&&this._time&&this.totalProgress()<1)?this._tTime%(this._dur+this._rDelay):this._ts?Md(r.rawTime(i),this):this._tTime:this._tTime},e.revert=function(i){i===void 0&&(i=tD);var r=Nn;return Nn=i,j0(this)&&(this.timeline&&this.timeline.revert(i),this.totalTime(-.01,i.suppressEvents)),this.data!=="nested"&&i.kill!==!1&&this.kill(),Nn=r,this},e.globalTime=function(i){for(var r=this,s=arguments.length?i:r.rawTime();r;)s=r._start+s/(Math.abs(r._ts)||1),r=r._dp;return!this.parent&&this._sat?this._sat.globalTime(i):s},e.repeat=function(i){return arguments.length?(this._repeat=i===1/0?-2:i,Nx(this)):this._repeat===-2?1/0:this._repeat},e.repeatDelay=function(i){if(arguments.length){var r=this._time;return this._rDelay=i,Nx(this),r?this.time(r):this}return this._rDelay},e.yoyo=function(i){return arguments.length?(this._yoyo=i,this):this._yoyo},e.seek=function(i,r){return this.totalTime($i(this,i),vi(r))},e.restart=function(i,r){return this.play().totalTime(i?-this._delay:0,vi(r)),this._dur||(this._zTime=-bt),this},e.play=function(i,r){return i!=null&&this.seek(i,r),this.reversed(!1).paused(!1)},e.reverse=function(i,r){return i!=null&&this.seek(i||this.totalDuration(),r),this.reversed(!0).paused(!1)},e.pause=function(i,r){return i!=null&&this.seek(i,r),this.paused(!0)},e.resume=function(){return this.paused(!1)},e.reversed=function(i){return arguments.length?(!!i!==this.reversed()&&this.timeScale(-this._rts||(i?-bt:0)),this):this._rts<0},e.invalidate=function(){return this._initted=this._act=0,this._zTime=-bt,this},e.isActive=function(){var i=this.parent||this._dp,r=this._start,s;return!!(!i||this._ts&&this._initted&&i.isActive()&&(s=i.rawTime(!0))>=r&&s<this.endTime(!0)-bt)},e.eventCallback=function(i,r,s){var a=this.vars;return arguments.length>1?(r?(a[i]=r,s&&(a[i+"Params"]=s),i==="onUpdate"&&(this._onUpdate=r)):delete a[i],this):a[i]},e.then=function(i){var r=this,s=r._prom;return new Promise(function(a){var o=jt(i)?i:NM,l=function(){var c=r.then;r.then=null,s&&s(),jt(o)&&(o=o(r))&&(o.then||o===r)&&(r.then=c),a(o),r.then=c};r._initted&&r.totalProgress()===1&&r._ts>=0||!r._tTime&&r._ts<0?l():r._prom=l})},e.kill=function(){eu(this)},n}();Hi(ec.prototype,{_time:0,_start:0,_end:0,_tTime:0,_tDur:0,_dirty:0,_repeat:0,_yoyo:!1,parent:null,_initted:!1,_rDelay:0,_ts:1,_dp:0,ratio:0,_zTime:-bt,_prom:0,_ps:!1,_rts:1});var di=function(n){SM(e,n);function e(i,r){var s;return i===void 0&&(i={}),s=n.call(this,i)||this,s.labels={},s.smoothChildTiming=!!i.smoothChildTiming,s.autoRemoveChildren=!!i.autoRemoveChildren,s._sort=vi(i.sortChildren),Ht&&Lr(i.parent||Ht,Qr(s),r),i.reversed&&s.reverse(),i.paused&&s.paused(!0),i.scrollTrigger&&FM(Qr(s),i.scrollTrigger),s}var t=e.prototype;return t.to=function(r,s,a){return _u(0,arguments,this),this},t.from=function(r,s,a){return _u(1,arguments,this),this},t.fromTo=function(r,s,a,o){return _u(2,arguments,this),this},t.set=function(r,s,a){return s.duration=0,s.parent=this,gu(s).repeatDelay||(s.repeat=0),s.immediateRender=!!s.immediateRender,new fn(r,s,$i(this,a),1),this},t.call=function(r,s,a){return Lr(this,fn.delayedCall(0,r,s),a)},t.staggerTo=function(r,s,a,o,l,u,c){return a.duration=s,a.stagger=a.stagger||o,a.onComplete=u,a.onCompleteParams=c,a.parent=this,new fn(r,a,$i(this,l)),this},t.staggerFrom=function(r,s,a,o,l,u,c){return a.runBackwards=1,gu(a).immediateRender=vi(a.immediateRender),this.staggerTo(r,s,a,o,l,u,c)},t.staggerFromTo=function(r,s,a,o,l,u,c,d){return o.startAt=a,gu(o).immediateRender=vi(o.immediateRender),this.staggerTo(r,s,o,l,u,c,d)},t.render=function(r,s,a){var o=this._time,l=this._dirty?this.totalDuration():this._tDur,u=this._dur,c=r<=0?0:zt(r),d=this._zTime<0!=r<0&&(this._initted||!u),f,h,m,_,g,p,v,S,x,E,T,w;if(this!==Ht&&c>l&&r>=0&&(c=l),c!==this._tTime||a||d){if(o!==this._time&&u&&(c+=this._time-o,r+=this._time-o),f=c,x=this._start,S=this._ts,p=!S,d&&(u||(o=this._zTime),(r||!s)&&(this._zTime=r)),this._repeat){if(T=this._yoyo,g=u+this._rDelay,this._repeat<-1&&r<0)return this.totalTime(g*100+r,s,a);if(f=zt(c%g),c===l?(_=this._repeat,f=u):(E=zt(c/g),_=~~E,_&&_===E&&(f=u,_--),f>u&&(f=u)),E=xl(this._tTime,g),!o&&this._tTime&&E!==_&&this._tTime-E*g-this._dur<=0&&(E=_),T&&_&1&&(f=u-f,w=1),_!==E&&!this._lock){var y=T&&E&1,A=y===(T&&_&1);if(_<E&&(y=!y),o=y?0:c%u?u:c,this._lock=1,this.render(o||(w?0:zt(_*g)),s,!u)._lock=0,this._tTime=c,!s&&this.parent&&Ui(this,"onRepeat"),this.vars.repeatRefresh&&!w&&(this.invalidate()._lock=1,E=_),o&&o!==this._time||p!==!this._ts||this.vars.onRepeat&&!this.parent&&!this._act)return this;if(u=this._dur,l=this._tDur,A&&(this._lock=2,o=y?u:-1e-4,this.render(o,!0),this.vars.repeatRefresh&&!w&&this.invalidate()),this._lock=0,!this._ts&&!p)return this}}if(this._hasPause&&!this._forcing&&this._lock<2&&(v=uD(this,zt(o),zt(f)),v&&(c-=f-(f=v._start))),this._tTime=c,this._time=f,this._act=!!S,this._initted||(this._onUpdate=this.vars.onUpdate,this._initted=1,this._zTime=r,o=0),!o&&c&&u&&!s&&!E&&(Ui(this,"onStart"),this._tTime!==c))return this;if(f>=o&&r>=0)for(h=this._first;h;){if(m=h._next,(h._act||f>=h._start)&&h._ts&&v!==h){if(h.parent!==this)return this.render(r,s,a);if(h.render(h._ts>0?(f-h._start)*h._ts:(h._dirty?h.totalDuration():h._tDur)+(f-h._start)*h._ts,s,a),f!==this._time||!this._ts&&!p){v=0,m&&(c+=this._zTime=-bt);break}}h=m}else{h=this._last;for(var R=r<0?r:f;h;){if(m=h._prev,(h._act||R<=h._end)&&h._ts&&v!==h){if(h.parent!==this)return this.render(r,s,a);if(h.render(h._ts>0?(R-h._start)*h._ts:(h._dirty?h.totalDuration():h._tDur)+(R-h._start)*h._ts,s,a||Nn&&j0(h)),f!==this._time||!this._ts&&!p){v=0,m&&(c+=this._zTime=R?-bt:bt);break}}h=m}}if(v&&!s&&(this.pause(),v.render(f>=o?0:-bt)._zTime=f>=o?1:-1,this._ts))return this._start=x,Jd(this),this.render(r,s,a);this._onUpdate&&!s&&Ui(this,"onUpdate",!0),(c===l&&this._tTime>=this.totalDuration()||!c&&o)&&(x===this._start||Math.abs(S)!==Math.abs(this._ts))&&(this._lock||((r||!u)&&(c===l&&this._ts>0||!c&&this._ts<0)&&aa(this,1),!s&&!(r<0&&!o)&&(c||o||!l)&&(Ui(this,c===l&&r>=0?"onComplete":"onReverseComplete",!0),this._prom&&!(c<l&&this.timeScale()>0)&&this._prom())))}return this},t.add=function(r,s){var a=this;if(vs(s)||(s=$i(this,s,r)),!(r instanceof ec)){if(qn(r))return r.forEach(function(o){return a.add(o,s)}),this;if(Rn(r))return this.addLabel(r,s);if(jt(r))r=fn.delayedCall(0,r);else return this}return this!==r?Lr(this,r,s):this},t.getChildren=function(r,s,a,o){r===void 0&&(r=!0),s===void 0&&(s=!0),a===void 0&&(a=!0),o===void 0&&(o=-tr);for(var l=[],u=this._first;u;)u._start>=o&&(u instanceof fn?s&&l.push(u):(a&&l.push(u),r&&l.push.apply(l,u.getChildren(!0,s,a)))),u=u._next;return l},t.getById=function(r){for(var s=this.getChildren(1,1,1),a=s.length;a--;)if(s[a].vars.id===r)return s[a]},t.remove=function(r){return Rn(r)?this.removeLabel(r):jt(r)?this.killTweensOf(r):(r.parent===this&&Qd(this,r),r===this._recent&&(this._recent=this._last),ka(this))},t.totalTime=function(r,s){return arguments.length?(this._forcing=1,!this._dp&&this._ts&&(this._start=zt(Li.time-(this._ts>0?r/this._ts:(this.totalDuration()-r)/-this._ts))),n.prototype.totalTime.call(this,r,s),this._forcing=0,this):this._tTime},t.addLabel=function(r,s){return this.labels[r]=$i(this,s),this},t.removeLabel=function(r){return delete this.labels[r],this},t.addPause=function(r,s,a){var o=fn.delayedCall(0,s||ju,a);return o.data="isPause",this._hasPause=1,Lr(this,o,$i(this,r))},t.removePause=function(r){var s=this._first;for(r=$i(this,r);s;)s._start===r&&s.data==="isPause"&&aa(s),s=s._next},t.killTweensOf=function(r,s,a){for(var o=this.getTweensOf(r,a),l=o.length;l--;)Vs!==o[l]&&o[l].kill(r,s);return this},t.getTweensOf=function(r,s){for(var a=[],o=nr(r),l=this._first,u=vs(s),c;l;)l instanceof fn?nD(l._targets,o)&&(u?(!Vs||l._initted&&l._ts)&&l.globalTime(0)<=s&&l.globalTime(l.totalDuration())>s:!s||l.isActive())&&a.push(l):(c=l.getTweensOf(o,s)).length&&a.push.apply(a,c),l=l._next;return a},t.tweenTo=function(r,s){s=s||{};var a=this,o=$i(a,r),l=s,u=l.startAt,c=l.onStart,d=l.onStartParams,f=l.immediateRender,h,m=fn.to(a,Hi({ease:s.ease||"none",lazy:!1,immediateRender:!1,time:o,overwrite:"auto",duration:s.duration||Math.abs((o-(u&&"time"in u?u.time:a._time))/a.timeScale())||bt,onStart:function(){if(a.pause(),!h){var g=s.duration||Math.abs((o-(u&&"time"in u?u.time:a._time))/a.timeScale());m._dur!==g&&yl(m,g,0,1).render(m._time,!0,!0),h=1}c&&c.apply(m,d||[])}},s));return f?m.render(0):m},t.tweenFromTo=function(r,s,a){return this.tweenTo(s,Hi({startAt:{time:$i(this,r)}},a))},t.recent=function(){return this._recent},t.nextLabel=function(r){return r===void 0&&(r=this._time),Ix(this,$i(this,r))},t.previousLabel=function(r){return r===void 0&&(r=this._time),Ix(this,$i(this,r),1)},t.currentLabel=function(r){return arguments.length?this.seek(r,!0):this.previousLabel(this._time+bt)},t.shiftChildren=function(r,s,a){a===void 0&&(a=0);var o=this._first,l=this.labels,u;for(r=zt(r);o;)o._start>=a&&(o._start+=r,o._end+=r),o=o._next;if(s)for(u in l)l[u]>=a&&(l[u]+=r);return ka(this)},t.invalidate=function(r){var s=this._first;for(this._lock=0;s;)s.invalidate(r),s=s._next;return n.prototype.invalidate.call(this,r)},t.clear=function(r){r===void 0&&(r=!0);for(var s=this._first,a;s;)a=s._next,this.remove(s),s=a;return this._dp&&(this._time=this._tTime=this._pTime=0),r&&(this.labels={}),ka(this)},t.totalDuration=function(r){var s=0,a=this,o=a._last,l=tr,u,c,d;if(arguments.length)return a.timeScale((a._repeat<0?a.duration():a.totalDuration())/(a.reversed()?-r:r));if(a._dirty){for(d=a.parent;o;)u=o._prev,o._dirty&&o.totalDuration(),c=o._start,c>l&&a._sort&&o._ts&&!a._lock?(a._lock=1,Lr(a,o,c-o._delay,1)._lock=0):l=c,c<0&&o._ts&&(s-=c,(!d&&!a._dp||d&&d.smoothChildTiming)&&(a._start+=zt(c/a._ts),a._time-=c,a._tTime-=c),a.shiftChildren(-c,!1,-1/0),l=0),o._end>s&&o._ts&&(s=o._end),o=u;yl(a,a===Ht&&a._time>s?a._time:s,1,1),a._dirty=0}return a._tDur},e.updateRoot=function(r){if(Ht._ts&&(DM(Ht,Md(r,Ht)),bM=Li.frame),Li.frame>=Px){Px+=Bi.autoSleep||120;var s=Ht._first;if((!s||!s._ts)&&Bi.autoSleep&&Li._listeners.length<2){for(;s&&!s._ts;)s=s._next;s||Li.sleep()}}},e}(ec);Hi(di.prototype,{_lock:0,_hasPause:0,_forcing:0});var AD=function(e,t,i,r,s,a,o){var l=new yi(this._pt,e,t,0,1,iE,null,s),u=0,c=0,d,f,h,m,_,g,p,v;for(l.b=i,l.e=r,i+="",r+="",(p=~r.indexOf("random("))&&(r=Qu(r)),a&&(v=[i,r],a(v,e,t),i=v[0],r=v[1]),f=i.match(up)||[];d=up.exec(r);)m=d[0],_=r.substring(u,d.index),h?h=(h+1)%5:_.substr(-5)==="rgba("&&(h=1),m!==f[c++]&&(g=parseFloat(f[c-1])||0,l._pt={_next:l._pt,p:_||c===1?_:",",s:g,c:m.charAt(1)==="="?el(g,m)-g:parseFloat(m)-g,m:h&&h<4?Math.round:0},u=up.lastIndex);return l.c=u<r.length?r.substring(u,r.length):"",l.fp=o,(wM.test(r)||p)&&(l.e=0),this._pt=l,l},Q0=function(e,t,i,r,s,a,o,l,u,c){jt(r)&&(r=r(s||0,e,a));var d=e[t],f=i!=="get"?i:jt(d)?u?e[t.indexOf("set")||!jt(e["get"+t.substr(3)])?t:"get"+t.substr(3)](u):e[t]():d,h=jt(d)?u?DD:tE:e_,m;if(Rn(r)&&(~r.indexOf("random(")&&(r=Qu(r)),r.charAt(1)==="="&&(m=el(f,r)+(Wn(f)||0),(m||m===0)&&(r=m))),!c||f!==r||xg)return!isNaN(f*r)&&r!==""?(m=new yi(this._pt,e,t,+f||0,r-(f||0),typeof d=="boolean"?ND:nE,0,h),u&&(m.fp=u),o&&m.modifier(o,this,e),this._pt=m):(!d&&!(t in e)&&q0(t,r),AD.call(this,e,t,f,r,h,l||Bi.stringFilter,u))},CD=function(e,t,i,r,s){if(jt(e)&&(e=vu(e,s,t,i,r)),!Xr(e)||e.style&&e.nodeType||qn(e)||EM(e))return Rn(e)?vu(e,s,t,i,r):e;var a={},o;for(o in e)a[o]=vu(e[o],s,t,i,r);return a},QM=function(e,t,i,r,s,a){var o,l,u,c;if(Pi[e]&&(o=new Pi[e]).init(s,o.rawVars?t[e]:CD(t[e],r,s,a,i),i,r,a)!==!1&&(i._pt=l=new yi(i._pt,s,e,0,1,o.render,o,0,o.priority),i!==Go))for(u=i._ptLookup[i._targets.indexOf(s)],c=o._props.length;c--;)u[o._props[c]]=l;return o},Vs,xg,J0=function n(e,t,i){var r=e.vars,s=r.ease,a=r.startAt,o=r.immediateRender,l=r.lazy,u=r.onUpdate,c=r.runBackwards,d=r.yoyoEase,f=r.keyframes,h=r.autoRevert,m=e._dur,_=e._startAt,g=e._targets,p=e.parent,v=p&&p.data==="nested"?p.vars.targets:g,S=e._overwrite==="auto"&&!G0,x=e.timeline,E=r.easeReverse||d,T,w,y,A,R,D,L,z,I,F,G,U,N;if(x&&(!f||!s)&&(s="none"),e._ease=Ba(s,Ku.ease),e._rEase=E&&(Ba(E)||e._ease),e._from=!x&&!!r.runBackwards,e._from&&(e.ratio=1),!x||f&&!r.stagger){if(z=g[0]?Oa(g[0]).harness:0,U=z&&r[z.prop],T=Sd(r,$0),_&&(_._zTime<0&&_.progress(1),t<0&&c&&o&&!h?_.render(-1,!0):_.revert(c&&m?If:eD),_._lazy=0),a){if(aa(e._startAt=fn.set(g,Hi({data:"isStart",overwrite:!1,parent:p,immediateRender:!0,lazy:!_&&vi(l),startAt:null,delay:0,onUpdate:u&&function(){return Ui(e,"onUpdate")},stagger:0},a))),e._startAt._dp=0,e._startAt._sat=e,t<0&&(Nn||!o&&!h)&&e._startAt.revert(If),o&&m&&t<=0&&i<=0){t&&(e._zTime=t);return}}else if(c&&m&&!_){if(t&&(o=!1),y=Hi({overwrite:!1,data:"isFromStart",lazy:o&&!_&&vi(l),immediateRender:o,stagger:0,parent:p},T),U&&(y[z.prop]=U),aa(e._startAt=fn.set(g,y)),e._startAt._dp=0,e._startAt._sat=e,t<0&&(Nn?e._startAt.revert(If):e._startAt.render(-1,!0)),e._zTime=t,!o)n(e._startAt,bt,bt);else if(!t)return}for(e._pt=e._ptCache=0,l=m&&vi(l)||l&&!m,w=0;w<g.length;w++){if(R=g[w],L=R._gsap||Z0(g)[w]._gsap,e._ptLookup[w]=F={},hg[L.id]&&ea.length&&yd(),G=v===g?w:v.indexOf(R),z&&(I=new z).init(R,U||T,e,G,v)!==!1&&(e._pt=A=new yi(e._pt,R,I.name,0,1,I.render,I,0,I.priority),I._props.forEach(function(O){F[O]=A}),I.priority&&(D=1)),!z||U)for(y in T)Pi[y]&&(I=QM(y,T,e,G,R,v))?I.priority&&(D=1):F[y]=A=Q0.call(e,R,y,"get",T[y],G,v,0,r.stringFilter);e._op&&e._op[w]&&e.kill(R,e._op[w]),S&&e._pt&&(Vs=e,Ht.killTweensOf(R,F,e.globalTime(t)),N=!e.parent,Vs=0),e._pt&&l&&(hg[L.id]=1)}D&&rE(e),e._onInit&&e._onInit(e)}e._onUpdate=u,e._initted=(!e._op||e._pt)&&!N,f&&t<=0&&x.render(tr,!0,!0)},RD=function(e,t,i,r,s,a,o,l){var u=(e._pt&&e._ptCache||(e._ptCache={}))[t],c,d,f,h;if(!u)for(u=e._ptCache[t]=[],f=e._ptLookup,h=e._targets.length;h--;){if(c=f[h][t],c&&c.d&&c.d._pt)for(c=c.d._pt;c&&c.p!==t&&c.fp!==t;)c=c._next;if(!c)return xg=1,e.vars[t]="+=0",J0(e,o),xg=0,l?Zu(t+" not eligible for reset. Try splitting into individual properties"):1;u.push(c)}for(h=u.length;h--;)d=u[h],c=d._pt||d,c.s=(r||r===0)&&!s?r:c.s+(r||0)+a*c.c,c.c=i-c.s,d.e&&(d.e=tn(i)+Wn(d.e)),d.b&&(d.b=c.s+Wn(d.b))},bD=function(e,t){var i=e[0]?Oa(e[0]).harness:0,r=i&&i.aliases,s,a,o,l;if(!r)return t;s=vl({},t);for(a in r)if(a in s)for(l=r[a].split(","),o=l.length;o--;)s[l[o]]=s[a];return s},PD=function(e,t,i,r){var s=t.ease||r||"power1.inOut",a,o;if(qn(t))o=i[e]||(i[e]=[]),t.forEach(function(l,u){return o.push({t:u/(t.length-1)*100,v:l,e:s})});else for(a in t)o=i[a]||(i[a]=[]),a==="ease"||o.push({t:parseFloat(e),v:t[a],e:s})},vu=function(e,t,i,r,s){return jt(e)?e.call(t,i,r,s):Rn(e)&&~e.indexOf("random(")?Qu(e):e},JM=K0+"repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert",eE={};xi(JM+",id,stagger,delay,duration,paused,scrollTrigger",function(n){return eE[n]=1});var fn=function(n){SM(e,n);function e(i,r,s,a){var o;typeof r=="number"&&(s.duration=r,r=s,s=null),o=n.call(this,a?r:gu(r))||this;var l=o.vars,u=l.duration,c=l.delay,d=l.immediateRender,f=l.stagger,h=l.overwrite,m=l.keyframes,_=l.defaults,g=l.scrollTrigger,p=r.parent||Ht,v=(qn(i)||EM(i)?vs(i[0]):"length"in r)?[i]:nr(i),S,x,E,T,w,y,A,R;if(o._targets=v.length?Z0(v):Zu("GSAP target "+i+" not found. https://gsap.com",!Bi.nullTargetWarn)||[],o._ptLookup=[],o._overwrite=h,m||f||nf(u)||nf(c)){r=o.vars;var D=r.easeReverse||r.yoyoEase;if(S=o.timeline=new di({data:"nested",defaults:_||{},targets:p&&p.data==="nested"?p.vars.targets:v}),S.kill(),S.parent=S._dp=Qr(o),S._start=0,f||nf(u)||nf(c)){if(T=v.length,A=f&&zM(f),Xr(f))for(w in f)~JM.indexOf(w)&&(R||(R={}),R[w]=f[w]);for(x=0;x<T;x++)E=Sd(r,eE),E.stagger=0,D&&(E.easeReverse=D),R&&vl(E,R),y=v[x],E.duration=+vu(u,Qr(o),x,y,v),E.delay=(+vu(c,Qr(o),x,y,v)||0)-o._delay,!f&&T===1&&E.delay&&(o._delay=c=E.delay,o._start+=c,E.delay=0),S.to(y,E,A?A(x,y,v):0),S._ease=pt.none;S.duration()?u=c=0:o.timeline=0}else if(m){gu(Hi(S.vars.defaults,{ease:"none"})),S._ease=Ba(m.ease||r.ease||"none");var L=0,z,I,F;if(qn(m))m.forEach(function(G){return S.to(v,G,">")}),S.duration();else{E={};for(w in m)w==="ease"||w==="easeEach"||PD(w,m[w],E,m.easeEach);for(w in E)for(z=E[w].sort(function(G,U){return G.t-U.t}),L=0,x=0;x<z.length;x++)I=z[x],F={ease:I.e,duration:(I.t-(x?z[x-1].t:0))/100*u},F[w]=I.v,S.to(v,F,L),L+=F.duration;S.duration()<u&&S.to({},{duration:u-S.duration()})}}u||o.duration(u=S.duration())}else o.timeline=0;return h===!0&&!G0&&(Vs=Qr(o),Ht.killTweensOf(v),Vs=0),Lr(p,Qr(o),s),r.reversed&&o.reverse(),r.paused&&o.paused(!0),(d||!u&&!m&&o._start===zt(p._time)&&vi(d)&&aD(Qr(o))&&p.data!=="nested")&&(o._tTime=-bt,o.render(Math.max(0,-c)||0)),g&&FM(Qr(o),g),o}var t=e.prototype;return t.render=function(r,s,a){var o=this._time,l=this._tDur,u=this._dur,c=r<0,d=r>l-bt&&!c?l:r<bt?0:r,f,h,m,_,g,p,v,S;if(!u)lD(this,r,s,a);else if(d!==this._tTime||!r||a||!this._initted&&this._tTime||this._startAt&&this._zTime<0!==c||this._lazy){if(f=d,S=this.timeline,this._repeat){if(_=u+this._rDelay,this._repeat<-1&&c)return this.totalTime(_*100+r,s,a);if(f=zt(d%_),d===l?(m=this._repeat,f=u):(g=zt(d/_),m=~~g,m&&m===g?(f=u,m--):f>u&&(f=u)),p=this._yoyo&&m&1,p&&(f=u-f),g=xl(this._tTime,_),f===o&&!a&&this._initted&&m===g)return this._tTime=d,this;m!==g&&this.vars.repeatRefresh&&!p&&!this._lock&&f!==_&&this._initted&&(this._lock=a=1,this.render(zt(_*m),!0).invalidate()._lock=0)}if(!this._initted){if(OM(this,c?r:f,a,s,d))return this._tTime=0,this;if(o!==this._time&&!(a&&this.vars.repeatRefresh&&m!==g))return this;if(u!==this._dur)return this.render(r,s,a)}if(this._rEase){var x=f<o;if(x!==this._inv){var E=x?o:u-o;this._inv=x,this._from&&(this.ratio=1-this.ratio),this._invRatio=this.ratio,this._invTime=o,this._invRecip=E?(x?-1:1)/E:0,this._invScale=x?-this.ratio:1-this.ratio,this._invEase=x?this._rEase:this._ease}this.ratio=v=this._invRatio+this._invScale*this._invEase((f-this._invTime)*this._invRecip)}else this.ratio=v=this._ease(f/u);if(this._from&&(this.ratio=v=1-v),this._tTime=d,this._time=f,!this._act&&this._ts&&(this._act=1,this._lazy=0),!o&&d&&!s&&!g&&(Ui(this,"onStart"),this._tTime!==d))return this;for(h=this._pt;h;)h.r(v,h.d),h=h._next;S&&S.render(r<0?r:S._dur*S._ease(f/this._dur),s,a)||this._startAt&&(this._zTime=r),this._onUpdate&&!s&&(c&&pg(this,r,s,a),Ui(this,"onUpdate")),this._repeat&&m!==g&&this.vars.onRepeat&&!s&&this.parent&&Ui(this,"onRepeat"),(d===this._tDur||!d)&&this._tTime===d&&(c&&!this._onUpdate&&pg(this,r,!0,!0),(r||!u)&&(d===this._tDur&&this._ts>0||!d&&this._ts<0)&&aa(this,1),!s&&!(c&&!o)&&(d||o||p)&&(Ui(this,d===l?"onComplete":"onReverseComplete",!0),this._prom&&!(d<l&&this.timeScale()>0)&&this._prom()))}return this},t.targets=function(){return this._targets},t.invalidate=function(r){return(!r||!this.vars.runBackwards)&&(this._startAt=0),this._pt=this._op=this._onUpdate=this._lazy=this.ratio=0,this._ptLookup=[],this.timeline&&this.timeline.invalidate(r),n.prototype.invalidate.call(this,r)},t.resetTo=function(r,s,a,o,l){Ju||Li.wake(),this._ts||this.play();var u=Math.min(this._dur,(this._dp._time-this._start)*this._ts),c;return this._initted||J0(this,u),c=this._ease(u/this._dur),RD(this,r,s,a,o,c,u,l)?this.resetTo(r,s,a,o,1):(eh(this,0),this.parent||IM(this._dp,this,"_first","_last",this._dp._sort?"_start":0),this.render(0))},t.kill=function(r,s){if(s===void 0&&(s="all"),!r&&(!s||s==="all"))return this._lazy=this._pt=0,this.parent?eu(this):this.scrollTrigger&&this.scrollTrigger.kill(!!Nn),this;if(this.timeline){var a=this.timeline.totalDuration();return this.timeline.killTweensOf(r,s,Vs&&Vs.vars.overwrite!==!0)._first||eu(this),this.parent&&a!==this.timeline.totalDuration()&&yl(this,this._dur*this.timeline._tDur/a,0,1),this}var o=this._targets,l=r?nr(r):o,u=this._ptLookup,c=this._pt,d,f,h,m,_,g,p;if((!s||s==="all")&&rD(o,l))return s==="all"&&(this._pt=0),eu(this);for(d=this._op=this._op||[],s!=="all"&&(Rn(s)&&(_={},xi(s,function(v){return _[v]=1}),s=_),s=bD(o,s)),p=o.length;p--;)if(~l.indexOf(o[p])){f=u[p],s==="all"?(d[p]=s,m=f,h={}):(h=d[p]=d[p]||{},m=s);for(_ in m)g=f&&f[_],g&&((!("kill"in g.d)||g.d.kill(_)===!0)&&Qd(this,g,"_pt"),delete f[_]),h!=="all"&&(h[_]=1)}return this._initted&&!this._pt&&c&&eu(this),this},e.to=function(r,s){return new e(r,s,arguments[2])},e.from=function(r,s){return _u(1,arguments)},e.delayedCall=function(r,s,a,o){return new e(s,0,{immediateRender:!1,lazy:!1,overwrite:!1,delay:r,onComplete:s,onReverseComplete:s,onCompleteParams:a,onReverseCompleteParams:a,callbackScope:o})},e.fromTo=function(r,s,a){return _u(2,arguments)},e.set=function(r,s){return s.duration=0,s.repeatDelay||(s.repeat=0),new e(r,s)},e.killTweensOf=function(r,s,a){return Ht.killTweensOf(r,s,a)},e}(ec);Hi(fn.prototype,{_targets:[],_lazy:0,_startAt:0,_op:0,_onInit:0});xi("staggerTo,staggerFrom,staggerFromTo",function(n){fn[n]=function(){var e=new di,t=gg.call(arguments,0);return t.splice(n==="staggerFromTo"?5:4,0,0),e[n].apply(e,t)}});var e_=function(e,t,i){return e[t]=i},tE=function(e,t,i){return e[t](i)},DD=function(e,t,i,r){return e[t](r.fp,i)},LD=function(e,t,i){return e.setAttribute(t,i)},t_=function(e,t){return jt(e[t])?tE:W0(e[t])&&e.setAttribute?LD:e_},nE=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e6)/1e6,t)},ND=function(e,t){return t.set(t.t,t.p,!!(t.s+t.c*e),t)},iE=function(e,t){var i=t._pt,r="";if(!e&&t.b)r=t.b;else if(e===1&&t.e)r=t.e;else{for(;i;)r=i.p+(i.m?i.m(i.s+i.c*e):Math.round((i.s+i.c*e)*1e4)/1e4)+r,i=i._next;r+=t.c}t.set(t.t,t.p,r,t)},n_=function(e,t){for(var i=t._pt;i;)i.r(e,i.d),i=i._next},ID=function(e,t,i,r){for(var s=this._pt,a;s;)a=s._next,s.p===r&&s.modifier(e,t,i),s=a},UD=function(e){for(var t=this._pt,i,r;t;)r=t._next,t.p===e&&!t.op||t.op===e?Qd(this,t,"_pt"):t.dep||(i=1),t=r;return!i},FD=function(e,t,i,r){r.mSet(e,t,r.m.call(r.tween,i,r.mt),r)},rE=function(e){for(var t=e._pt,i,r,s,a;t;){for(i=t._next,r=s;r&&r.pr>t.pr;)r=r._next;(t._prev=r?r._prev:a)?t._prev._next=t:s=t,(t._next=r)?r._prev=t:a=t,t=i}e._pt=s},yi=function(){function n(t,i,r,s,a,o,l,u,c){this.t=i,this.s=s,this.c=a,this.p=r,this.r=o||nE,this.d=l||this,this.set=u||e_,this.pr=c||0,this._next=t,t&&(t._prev=this)}var e=n.prototype;return e.modifier=function(i,r,s){this.mSet=this.mSet||this.set,this.set=FD,this.m=i,this.mt=s,this.tween=r},n}();xi(K0+"parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse",function(n){return $0[n]=1});Vi.TweenMax=Vi.TweenLite=fn;Vi.TimelineLite=Vi.TimelineMax=di;Ht=new di({sortChildren:!1,defaults:Ku,autoRemoveChildren:!0,id:"root",smoothChildTiming:!0});Bi.stringFilter=KM;var za=[],Ff={},OD=[],Fx=0,kD=0,pp=function(e){return(Ff[e]||OD).map(function(t){return t()})},yg=function(){var e=Date.now(),t=[];e-Fx>2&&(pp("matchMediaInit"),za.forEach(function(i){var r=i.queries,s=i.conditions,a,o,l,u;for(o in r)a=Rr.matchMedia(r[o]).matches,a&&(l=1),a!==s[o]&&(s[o]=a,u=1);u&&(i.revert(),l&&t.push(i))}),pp("matchMediaRevert"),t.forEach(function(i){return i.onMatch(i,function(r){return i.add(null,r)})}),Fx=e,pp("matchMedia"))},sE=function(){function n(t,i){this.selector=i&&_g(i),this.data=[],this._r=[],this.isReverted=!1,this.id=kD++,t&&this.add(t)}var e=n.prototype;return e.add=function(i,r,s){jt(i)&&(s=r,r=i,i=jt);var a=this,o=function(){var u=Bt,c=a.selector,d;return u&&u!==a&&u.data.push(a),s&&(a.selector=_g(s)),Bt=a,d=r.apply(a,arguments),jt(d)&&a._r.push(d),Bt=u,a.selector=c,a.isReverted=!1,d};return a.last=o,i===jt?o(a,function(l){return a.add(null,l)}):i?a[i]=o:o},e.ignore=function(i){var r=Bt;Bt=null,i(this),Bt=r},e.getTweens=function(){var i=[];return this.data.forEach(function(r){return r instanceof n?i.push.apply(i,r.getTweens()):r instanceof fn&&!(r.parent&&r.parent.data==="nested")&&i.push(r)}),i},e.clear=function(){this._r.length=this.data.length=0},e.kill=function(i,r){var s=this;if(i?function(){for(var o=s.getTweens(),l=s.data.length,u;l--;)u=s.data[l],u.data==="isFlip"&&(u.revert(),u.getChildren(!0,!0,!1).forEach(function(c){return o.splice(o.indexOf(c),1)}));for(o.map(function(c){return{g:c._dur||c._delay||c._sat&&!c._sat.vars.immediateRender?c.globalTime(0):-1/0,t:c}}).sort(function(c,d){return d.g-c.g||-1/0}).forEach(function(c){return c.t.revert(i)}),l=s.data.length;l--;)u=s.data[l],u instanceof di?u.data!=="nested"&&(u.scrollTrigger&&u.scrollTrigger.revert(),u.kill()):!(u instanceof fn)&&u.revert&&u.revert(i);s._r.forEach(function(c){return c(i,s)}),s.isReverted=!0}():this.data.forEach(function(o){return o.kill&&o.kill()}),this.clear(),r)for(var a=za.length;a--;)za[a].id===this.id&&za.splice(a,1)},e.revert=function(i){this.kill(i||{})},n}(),BD=function(){function n(t){this.contexts=[],this.scope=t,Bt&&Bt.data.push(this)}var e=n.prototype;return e.add=function(i,r,s){Xr(i)||(i={matches:i});var a=new sE(0,s||this.scope),o=a.conditions={},l,u,c;Bt&&!a.selector&&(a.selector=Bt.selector),this.contexts.push(a),r=a.add("onMatch",r),a.queries=i;for(u in i)u==="all"?c=1:(l=Rr.matchMedia(i[u]),l&&(za.indexOf(a)<0&&za.push(a),(o[u]=l.matches)&&(c=1),l.addListener?l.addListener(yg):l.addEventListener("change",yg)));return c&&r(a,function(d){return a.add(null,d)}),this},e.revert=function(i){this.kill(i||{})},e.kill=function(i){this.contexts.forEach(function(r){return r.kill(i,!0)})},n}(),Ed={registerPlugin:function(){for(var e=arguments.length,t=new Array(e),i=0;i<e;i++)t[i]=arguments[i];t.forEach(function(r){return YM(r)})},timeline:function(e){return new di(e)},getTweensOf:function(e,t){return Ht.getTweensOf(e,t)},getProperty:function(e,t,i,r){Rn(e)&&(e=nr(e)[0]);var s=Oa(e||{}).get,a=i?NM:LM;return i==="native"&&(i=""),e&&(t?a((Pi[t]&&Pi[t].get||s)(e,t,i,r)):function(o,l,u){return a((Pi[o]&&Pi[o].get||s)(e,o,l,u))})},quickSetter:function(e,t,i){if(e=nr(e),e.length>1){var r=e.map(function(c){return Mi.quickSetter(c,t,i)}),s=r.length;return function(c){for(var d=s;d--;)r[d](c)}}e=e[0]||{};var a=Pi[t],o=Oa(e),l=o.harness&&(o.harness.aliases||{})[t]||t,u=a?function(c){var d=new a;Go._pt=0,d.init(e,i?c+i:c,Go,0,[e]),d.render(1,d),Go._pt&&n_(1,Go)}:o.set(e,l);return a?u:function(c){return u(e,l,i?c+i:c,o,1)}},quickTo:function(e,t,i){var r,s=Mi.to(e,Hi((r={},r[t]="+=0.1",r.paused=!0,r.stagger=0,r),i||{})),a=function(l,u,c){return s.resetTo(t,l,u,c)};return a.tween=s,a},isTweening:function(e){return Ht.getTweensOf(e,!0).length>0},defaults:function(e){return e&&e.ease&&(e.ease=Ba(e.ease,Ku.ease)),Dx(Ku,e||{})},config:function(e){return Dx(Bi,e||{})},registerEffect:function(e){var t=e.name,i=e.effect,r=e.plugins,s=e.defaults,a=e.extendTimeline;(r||"").split(",").forEach(function(o){return o&&!Pi[o]&&!Vi[o]&&Zu(t+" effect requires "+o+" plugin.")}),cp[t]=function(o,l,u){return i(nr(o),Hi(l||{},s),u)},a&&(di.prototype[t]=function(o,l,u){return this.add(cp[t](o,Xr(l)?l:(u=l)&&{},this),u)})},registerEase:function(e,t){pt[e]=Ba(t)},parseEase:function(e,t){return arguments.length?Ba(e,t):pt},getById:function(e){return Ht.getById(e)},exportRoot:function(e,t){e===void 0&&(e={});var i=new di(e),r,s;for(i.smoothChildTiming=vi(e.smoothChildTiming),Ht.remove(i),i._dp=0,i._time=i._tTime=Ht._time,r=Ht._first;r;)s=r._next,(t||!(!r._dur&&r instanceof fn&&r.vars.onComplete===r._targets[0]))&&Lr(i,r,r._start-r._delay),r=s;return Lr(Ht,i,0),i},context:function(e,t){return e?new sE(e,t):Bt},matchMedia:function(e){return new BD(e)},matchMediaRefresh:function(){return za.forEach(function(e){var t=e.conditions,i,r;for(r in t)t[r]&&(t[r]=!1,i=1);i&&e.revert()})||yg()},addEventListener:function(e,t){var i=Ff[e]||(Ff[e]=[]);~i.indexOf(t)||i.push(t)},removeEventListener:function(e,t){var i=Ff[e],r=i&&i.indexOf(t);r>=0&&i.splice(r,1)},utils:{wrap:gD,wrapYoyo:_D,distribute:zM,random:HM,snap:VM,normalize:mD,getUnit:Wn,clamp:fD,splitColor:qM,toArray:nr,selector:_g,mapRange:WM,pipe:hD,unitize:pD,interpolate:vD,shuffle:BM},install:CM,effects:cp,ticker:Li,updateRoot:di.updateRoot,plugins:Pi,globalTimeline:Ht,core:{PropTween:yi,globals:RM,Tween:fn,Timeline:di,Animation:ec,getCache:Oa,_removeLinkedListItem:Qd,reverting:function(){return Nn},context:function(e){return e&&Bt&&(Bt.data.push(e),e._ctx=Bt),Bt},suppressOverwrites:function(e){return G0=e}}};xi("to,from,fromTo,delayedCall,set,killTweensOf",function(n){return Ed[n]=fn[n]});Li.add(di.updateRoot);Go=Ed.to({},{duration:0});var zD=function(e,t){for(var i=e._pt;i&&i.p!==t&&i.op!==t&&i.fp!==t;)i=i._next;return i},VD=function(e,t){var i=e._targets,r,s,a;for(r in t)for(s=i.length;s--;)a=e._ptLookup[s][r],a&&(a=a.d)&&(a._pt&&(a=zD(a,r)),a&&a.modifier&&a.modifier(t[r],e,i[s],r))},mp=function(e,t){return{name:e,headless:1,rawVars:1,init:function(r,s,a){a._onInit=function(o){var l,u;if(Rn(s)&&(l={},xi(s,function(c){return l[c]=1}),s=l),t){l={};for(u in s)l[u]=t(s[u]);s=l}VD(o,s)}}}},Mi=Ed.registerPlugin({name:"attr",init:function(e,t,i,r,s){var a,o,l;this.tween=i;for(a in t)l=e.getAttribute(a)||"",o=this.add(e,"setAttribute",(l||0)+"",t[a],r,s,0,0,a),o.op=a,o.b=l,this._props.push(a)},render:function(e,t){for(var i=t._pt;i;)Nn?i.set(i.t,i.p,i.b,i):i.r(e,i.d),i=i._next}},{name:"endArray",headless:1,init:function(e,t){for(var i=t.length;i--;)this.add(e,i,e[i]||0,t[i],0,0,0,0,0,1)}},mp("roundProps",vg),mp("modifiers"),mp("snap",VM))||Ed;fn.version=di.version=Mi.version="3.15.0";AM=1;X0()&&Sl();pt.Power0;pt.Power1;pt.Power2;pt.Power3;pt.Power4;pt.Linear;pt.Quad;pt.Cubic;pt.Quart;pt.Quint;pt.Strong;pt.Elastic;pt.Back;pt.SteppedEase;pt.Bounce;pt.Sine;pt.Expo;pt.Circ;/*!
 * CSSPlugin 3.15.0
 * https://gsap.com
 *
 * Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var Ox,Hs,tl,i_,Na,kx,r_,HD=function(){return typeof window<"u"},xs={},Ea=180/Math.PI,nl=Math.PI/180,Eo=Math.atan2,Bx=1e8,s_=/([A-Z])/g,GD=/(left|right|width|margin|padding|x)/i,WD=/[\s,\(]\S/,Ur={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},Sg=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},XD=function(e,t){return t.set(t.t,t.p,e===1?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},YD=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},qD=function(e,t){return t.set(t.t,t.p,e===1?t.e:e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},$D=function(e,t){var i=t.s+t.c*e;t.set(t.t,t.p,~~(i+(i<0?-.5:.5))+t.u,t)},aE=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},oE=function(e,t){return t.set(t.t,t.p,e!==1?t.b:t.e,t)},KD=function(e,t,i){return e.style[t]=i},ZD=function(e,t,i){return e.style.setProperty(t,i)},jD=function(e,t,i){return e._gsap[t]=i},QD=function(e,t,i){return e._gsap.scaleX=e._gsap.scaleY=i},JD=function(e,t,i,r,s){var a=e._gsap;a.scaleX=a.scaleY=i,a.renderTransform(s,a)},eL=function(e,t,i,r,s){var a=e._gsap;a[t]=i,a.renderTransform(s,a)},Gt="transform",Si=Gt+"Origin",tL=function n(e,t){var i=this,r=this.target,s=r.style,a=r._gsap;if(e in xs&&s){if(this.tfm=this.tfm||{},e!=="transform")e=Ur[e]||e,~e.indexOf(",")?e.split(",").forEach(function(o){return i.tfm[o]=es(r,o)}):this.tfm[e]=a.x?a[e]:es(r,e),e===Si&&(this.tfm.zOrigin=a.zOrigin);else return Ur.transform.split(",").forEach(function(o){return n.call(i,o,t)});if(this.props.indexOf(Gt)>=0)return;a.svg&&(this.svgo=r.getAttribute("data-svg-origin"),this.props.push(Si,t,"")),e=Gt}(s||t)&&this.props.push(e,t,s[e])},lE=function(e){e.translate&&(e.removeProperty("translate"),e.removeProperty("scale"),e.removeProperty("rotate"))},nL=function(){var e=this.props,t=this.target,i=t.style,r=t._gsap,s,a;for(s=0;s<e.length;s+=3)e[s+1]?e[s+1]===2?t[e[s]](e[s+2]):t[e[s]]=e[s+2]:e[s+2]?i[e[s]]=e[s+2]:i.removeProperty(e[s].substr(0,2)==="--"?e[s]:e[s].replace(s_,"-$1").toLowerCase());if(this.tfm){for(a in this.tfm)r[a]=this.tfm[a];r.svg&&(r.renderTransform(),t.setAttribute("data-svg-origin",this.svgo||"")),s=r_(),(!s||!s.isStart)&&!i[Gt]&&(lE(i),r.zOrigin&&i[Si]&&(i[Si]+=" "+r.zOrigin+"px",r.zOrigin=0,r.renderTransform()),r.uncache=1)}},uE=function(e,t){var i={target:e,props:[],revert:nL,save:tL};return e._gsap||Mi.core.getCache(e),t&&e.style&&e.nodeType&&t.split(",").forEach(function(r){return i.save(r)}),i},cE,Mg=function(e,t){var i=Hs.createElementNS?Hs.createElementNS((t||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),e):Hs.createElement(e);return i&&i.style?i:Hs.createElement(e)},Fi=function n(e,t,i){var r=getComputedStyle(e);return r[t]||r.getPropertyValue(t.replace(s_,"-$1").toLowerCase())||r.getPropertyValue(t)||!i&&n(e,Ml(t)||t,1)||""},zx="O,Moz,ms,Ms,Webkit".split(","),Ml=function(e,t,i){var r=t||Na,s=r.style,a=5;if(e in s&&!i)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);a--&&!(zx[a]+e in s););return a<0?null:(a===3?"ms":a>=0?zx[a]:"")+e},Eg=function(){HD()&&window.document&&(Ox=window,Hs=Ox.document,tl=Hs.documentElement,Na=Mg("div")||{style:{}},Mg("div"),Gt=Ml(Gt),Si=Gt+"Origin",Na.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",cE=!!Ml("perspective"),r_=Mi.core.reverting,i_=1)},Vx=function(e){var t=e.ownerSVGElement,i=Mg("svg",t&&t.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),r=e.cloneNode(!0),s;r.style.display="block",i.appendChild(r),tl.appendChild(i);try{s=r.getBBox()}catch{}return i.removeChild(r),tl.removeChild(i),s},Hx=function(e,t){for(var i=t.length;i--;)if(e.hasAttribute(t[i]))return e.getAttribute(t[i])},fE=function(e){var t,i;try{t=e.getBBox()}catch{t=Vx(e),i=1}return t&&(t.width||t.height)||i||(t=Vx(e)),t&&!t.width&&!t.x&&!t.y?{x:+Hx(e,["x","cx","x1"])||0,y:+Hx(e,["y","cy","y1"])||0,width:0,height:0}:t},dE=function(e){return!!(e.getCTM&&(!e.parentNode||e.ownerSVGElement)&&fE(e))},oa=function(e,t){if(t){var i=e.style,r;t in xs&&t!==Si&&(t=Gt),i.removeProperty?(r=t.substr(0,2),(r==="ms"||t.substr(0,6)==="webkit")&&(t="-"+t),i.removeProperty(r==="--"?t:t.replace(s_,"-$1").toLowerCase())):i.removeAttribute(t)}},Gs=function(e,t,i,r,s,a){var o=new yi(e._pt,t,i,0,1,a?oE:aE);return e._pt=o,o.b=r,o.e=s,e._props.push(i),o},Gx={deg:1,rad:1,turn:1},iL={grid:1,flex:1},la=function n(e,t,i,r){var s=parseFloat(i)||0,a=(i+"").trim().substr((s+"").length)||"px",o=Na.style,l=GD.test(t),u=e.tagName.toLowerCase()==="svg",c=(u?"client":"offset")+(l?"Width":"Height"),d=100,f=r==="px",h=r==="%",m,_,g,p;if(r===a||!s||Gx[r]||Gx[a])return s;if(a!=="px"&&!f&&(s=n(e,t,i,"px")),p=e.getCTM&&dE(e),(h||a==="%")&&(xs[t]||~t.indexOf("adius")))return m=p?e.getBBox()[l?"width":"height"]:e[c],tn(h?s/m*d:s/100*m);if(o[l?"width":"height"]=d+(f?a:r),_=r!=="rem"&&~t.indexOf("adius")||r==="em"&&e.appendChild&&!u?e:e.parentNode,p&&(_=(e.ownerSVGElement||{}).parentNode),(!_||_===Hs||!_.appendChild)&&(_=Hs.body),g=_._gsap,g&&h&&g.width&&l&&g.time===Li.time&&!g.uncache)return tn(s/g.width*d);if(h&&(t==="height"||t==="width")){var v=e.style[t];e.style[t]=d+r,m=e[c],v?e.style[t]=v:oa(e,t)}else(h||a==="%")&&!iL[Fi(_,"display")]&&(o.position=Fi(e,"position")),_===e&&(o.position="static"),_.appendChild(Na),m=Na[c],_.removeChild(Na),o.position="absolute";return l&&h&&(g=Oa(_),g.time=Li.time,g.width=_[c]),tn(f?m*s/d:m&&s?d/m*s:0)},es=function(e,t,i,r){var s;return i_||Eg(),t in Ur&&t!=="transform"&&(t=Ur[t],~t.indexOf(",")&&(t=t.split(",")[0])),xs[t]&&t!=="transform"?(s=nc(e,r),s=t!=="transformOrigin"?s[t]:s.svg?s.origin:wd(Fi(e,Si))+" "+s.zOrigin+"px"):(s=e.style[t],(!s||s==="auto"||r||~(s+"").indexOf("calc("))&&(s=Td[t]&&Td[t](e,t,i)||Fi(e,t)||PM(e,t)||(t==="opacity"?1:0))),i&&!~(s+"").trim().indexOf(" ")?la(e,t,s,i)+i:s},rL=function(e,t,i,r){if(!i||i==="none"){var s=Ml(t,e,1),a=s&&Fi(e,s,1);a&&a!==i?(t=s,i=a):t==="borderColor"&&(i=Fi(e,"borderTopColor"))}var o=new yi(this._pt,e.style,t,0,1,iE),l=0,u=0,c,d,f,h,m,_,g,p,v,S,x,E;if(o.b=i,o.e=r,i+="",r+="",r.substring(0,6)==="var(--"&&(r=Fi(e,r.substring(4,r.indexOf(")")))),r==="auto"&&(_=e.style[t],e.style[t]=r,r=Fi(e,t)||r,_?e.style[t]=_:oa(e,t)),c=[i,r],KM(c),i=c[0],r=c[1],f=i.match(Ho)||[],E=r.match(Ho)||[],E.length){for(;d=Ho.exec(r);)g=d[0],v=r.substring(l,d.index),m?m=(m+1)%5:(v.substr(-5)==="rgba("||v.substr(-5)==="hsla(")&&(m=1),g!==(_=f[u++]||"")&&(h=parseFloat(_)||0,x=_.substr((h+"").length),g.charAt(1)==="="&&(g=el(h,g)+x),p=parseFloat(g),S=g.substr((p+"").length),l=Ho.lastIndex-S.length,S||(S=S||Bi.units[t]||x,l===r.length&&(r+=S,o.e+=S)),x!==S&&(h=la(e,t,_,S)||0),o._pt={_next:o._pt,p:v||u===1?v:",",s:h,c:p-h,m:m&&m<4||t==="zIndex"?Math.round:0});o.c=l<r.length?r.substring(l,r.length):""}else o.r=t==="display"&&r==="none"?oE:aE;return wM.test(r)&&(o.e=0),this._pt=o,o},Wx={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},sL=function(e){var t=e.split(" "),i=t[0],r=t[1]||"50%";return(i==="top"||i==="bottom"||r==="left"||r==="right")&&(e=i,i=r,r=e),t[0]=Wx[i]||i,t[1]=Wx[r]||r,t.join(" ")},aL=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var i=t.t,r=i.style,s=t.u,a=i._gsap,o,l,u;if(s==="all"||s===!0)r.cssText="",l=1;else for(s=s.split(","),u=s.length;--u>-1;)o=s[u],xs[o]&&(l=1,o=o==="transformOrigin"?Si:Gt),oa(i,o);l&&(oa(i,Gt),a&&(a.svg&&i.removeAttribute("transform"),r.scale=r.rotate=r.translate="none",nc(i,1),a.uncache=1,lE(r)))}},Td={clearProps:function(e,t,i,r,s){if(s.data!=="isFromStart"){var a=e._pt=new yi(e._pt,t,i,0,0,aL);return a.u=r,a.pr=-10,a.tween=s,e._props.push(i),1}}},tc=[1,0,0,1,0,0],hE={},pE=function(e){return e==="matrix(1, 0, 0, 1, 0, 0)"||e==="none"||!e},Xx=function(e){var t=Fi(e,Gt);return pE(t)?tc:t.substr(7).match(TM).map(tn)},a_=function(e,t){var i=e._gsap||Oa(e),r=e.style,s=Xx(e),a,o,l,u;return i.svg&&e.getAttribute("transform")?(l=e.transform.baseVal.consolidate().matrix,s=[l.a,l.b,l.c,l.d,l.e,l.f],s.join(",")==="1,0,0,1,0,0"?tc:s):(s===tc&&!e.offsetParent&&e!==tl&&!i.svg&&(l=r.display,r.display="block",a=e.parentNode,(!a||!e.offsetParent&&!e.getBoundingClientRect().width)&&(u=1,o=e.nextElementSibling,tl.appendChild(e)),s=Xx(e),l?r.display=l:oa(e,"display"),u&&(o?a.insertBefore(e,o):a?a.appendChild(e):tl.removeChild(e))),t&&s.length>6?[s[0],s[1],s[4],s[5],s[12],s[13]]:s)},Tg=function(e,t,i,r,s,a){var o=e._gsap,l=s||a_(e,!0),u=o.xOrigin||0,c=o.yOrigin||0,d=o.xOffset||0,f=o.yOffset||0,h=l[0],m=l[1],_=l[2],g=l[3],p=l[4],v=l[5],S=t.split(" "),x=parseFloat(S[0])||0,E=parseFloat(S[1])||0,T,w,y,A;i?l!==tc&&(w=h*g-m*_)&&(y=x*(g/w)+E*(-_/w)+(_*v-g*p)/w,A=x*(-m/w)+E*(h/w)-(h*v-m*p)/w,x=y,E=A):(T=fE(e),x=T.x+(~S[0].indexOf("%")?x/100*T.width:x),E=T.y+(~(S[1]||S[0]).indexOf("%")?E/100*T.height:E)),r||r!==!1&&o.smooth?(p=x-u,v=E-c,o.xOffset=d+(p*h+v*_)-p,o.yOffset=f+(p*m+v*g)-v):o.xOffset=o.yOffset=0,o.xOrigin=x,o.yOrigin=E,o.smooth=!!r,o.origin=t,o.originIsAbsolute=!!i,e.style[Si]="0px 0px",a&&(Gs(a,o,"xOrigin",u,x),Gs(a,o,"yOrigin",c,E),Gs(a,o,"xOffset",d,o.xOffset),Gs(a,o,"yOffset",f,o.yOffset)),e.setAttribute("data-svg-origin",x+" "+E)},nc=function(e,t){var i=e._gsap||new jM(e);if("x"in i&&!t&&!i.uncache)return i;var r=e.style,s=i.scaleX<0,a="px",o="deg",l=getComputedStyle(e),u=Fi(e,Si)||"0",c,d,f,h,m,_,g,p,v,S,x,E,T,w,y,A,R,D,L,z,I,F,G,U,N,O,b,Q,te,Oe,be,Ce;return c=d=f=_=g=p=v=S=x=0,h=m=1,i.svg=!!(e.getCTM&&dE(e)),l.translate&&((l.translate!=="none"||l.scale!=="none"||l.rotate!=="none")&&(r[Gt]=(l.translate!=="none"?"translate3d("+(l.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+(l.rotate!=="none"?"rotate("+l.rotate+") ":"")+(l.scale!=="none"?"scale("+l.scale.split(" ").join(",")+") ":"")+(l[Gt]!=="none"?l[Gt]:"")),r.scale=r.rotate=r.translate="none"),w=a_(e,i.svg),i.svg&&(i.uncache?(N=e.getBBox(),u=i.xOrigin-N.x+"px "+(i.yOrigin-N.y)+"px",U=""):U=!t&&e.getAttribute("data-svg-origin"),Tg(e,U||u,!!U||i.originIsAbsolute,i.smooth!==!1,w)),E=i.xOrigin||0,T=i.yOrigin||0,w!==tc&&(D=w[0],L=w[1],z=w[2],I=w[3],c=F=w[4],d=G=w[5],w.length===6?(h=Math.sqrt(D*D+L*L),m=Math.sqrt(I*I+z*z),_=D||L?Eo(L,D)*Ea:0,v=z||I?Eo(z,I)*Ea+_:0,v&&(m*=Math.abs(Math.cos(v*nl))),i.svg&&(c-=E-(E*D+T*z),d-=T-(E*L+T*I))):(Ce=w[6],Oe=w[7],b=w[8],Q=w[9],te=w[10],be=w[11],c=w[12],d=w[13],f=w[14],y=Eo(Ce,te),g=y*Ea,y&&(A=Math.cos(-y),R=Math.sin(-y),U=F*A+b*R,N=G*A+Q*R,O=Ce*A+te*R,b=F*-R+b*A,Q=G*-R+Q*A,te=Ce*-R+te*A,be=Oe*-R+be*A,F=U,G=N,Ce=O),y=Eo(-z,te),p=y*Ea,y&&(A=Math.cos(-y),R=Math.sin(-y),U=D*A-b*R,N=L*A-Q*R,O=z*A-te*R,be=I*R+be*A,D=U,L=N,z=O),y=Eo(L,D),_=y*Ea,y&&(A=Math.cos(y),R=Math.sin(y),U=D*A+L*R,N=F*A+G*R,L=L*A-D*R,G=G*A-F*R,D=U,F=N),g&&Math.abs(g)+Math.abs(_)>359.9&&(g=_=0,p=180-p),h=tn(Math.sqrt(D*D+L*L+z*z)),m=tn(Math.sqrt(G*G+Ce*Ce)),y=Eo(F,G),v=Math.abs(y)>2e-4?y*Ea:0,x=be?1/(be<0?-be:be):0),i.svg&&(U=e.getAttribute("transform"),i.forceCSS=e.setAttribute("transform","")||!pE(Fi(e,Gt)),U&&e.setAttribute("transform",U))),Math.abs(v)>90&&Math.abs(v)<270&&(s?(h*=-1,v+=_<=0?180:-180,_+=_<=0?180:-180):(m*=-1,v+=v<=0?180:-180)),t=t||i.uncache,i.x=c-((i.xPercent=c&&(!t&&i.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-c)?-50:0)))?e.offsetWidth*i.xPercent/100:0)+a,i.y=d-((i.yPercent=d&&(!t&&i.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-d)?-50:0)))?e.offsetHeight*i.yPercent/100:0)+a,i.z=f+a,i.scaleX=tn(h),i.scaleY=tn(m),i.rotation=tn(_)+o,i.rotationX=tn(g)+o,i.rotationY=tn(p)+o,i.skewX=v+o,i.skewY=S+o,i.transformPerspective=x+a,(i.zOrigin=parseFloat(u.split(" ")[2])||!t&&i.zOrigin||0)&&(r[Si]=wd(u)),i.xOffset=i.yOffset=0,i.force3D=Bi.force3D,i.renderTransform=i.svg?lL:cE?mE:oL,i.uncache=0,i},wd=function(e){return(e=e.split(" "))[0]+" "+e[1]},gp=function(e,t,i){var r=Wn(t);return tn(parseFloat(t)+parseFloat(la(e,"x",i+"px",r)))+r},oL=function(e,t){t.z="0px",t.rotationY=t.rotationX="0deg",t.force3D=0,mE(e,t)},va="0deg",Xl="0px",xa=") ",mE=function(e,t){var i=t||this,r=i.xPercent,s=i.yPercent,a=i.x,o=i.y,l=i.z,u=i.rotation,c=i.rotationY,d=i.rotationX,f=i.skewX,h=i.skewY,m=i.scaleX,_=i.scaleY,g=i.transformPerspective,p=i.force3D,v=i.target,S=i.zOrigin,x="",E=p==="auto"&&e&&e!==1||p===!0;if(S&&(d!==va||c!==va)){var T=parseFloat(c)*nl,w=Math.sin(T),y=Math.cos(T),A;T=parseFloat(d)*nl,A=Math.cos(T),a=gp(v,a,w*A*-S),o=gp(v,o,-Math.sin(T)*-S),l=gp(v,l,y*A*-S+S)}g!==Xl&&(x+="perspective("+g+xa),(r||s)&&(x+="translate("+r+"%, "+s+"%) "),(E||a!==Xl||o!==Xl||l!==Xl)&&(x+=l!==Xl||E?"translate3d("+a+", "+o+", "+l+") ":"translate("+a+", "+o+xa),u!==va&&(x+="rotate("+u+xa),c!==va&&(x+="rotateY("+c+xa),d!==va&&(x+="rotateX("+d+xa),(f!==va||h!==va)&&(x+="skew("+f+", "+h+xa),(m!==1||_!==1)&&(x+="scale("+m+", "+_+xa),v.style[Gt]=x||"translate(0, 0)"},lL=function(e,t){var i=t||this,r=i.xPercent,s=i.yPercent,a=i.x,o=i.y,l=i.rotation,u=i.skewX,c=i.skewY,d=i.scaleX,f=i.scaleY,h=i.target,m=i.xOrigin,_=i.yOrigin,g=i.xOffset,p=i.yOffset,v=i.forceCSS,S=parseFloat(a),x=parseFloat(o),E,T,w,y,A;l=parseFloat(l),u=parseFloat(u),c=parseFloat(c),c&&(c=parseFloat(c),u+=c,l+=c),l||u?(l*=nl,u*=nl,E=Math.cos(l)*d,T=Math.sin(l)*d,w=Math.sin(l-u)*-f,y=Math.cos(l-u)*f,u&&(c*=nl,A=Math.tan(u-c),A=Math.sqrt(1+A*A),w*=A,y*=A,c&&(A=Math.tan(c),A=Math.sqrt(1+A*A),E*=A,T*=A)),E=tn(E),T=tn(T),w=tn(w),y=tn(y)):(E=d,y=f,T=w=0),(S&&!~(a+"").indexOf("px")||x&&!~(o+"").indexOf("px"))&&(S=la(h,"x",a,"px"),x=la(h,"y",o,"px")),(m||_||g||p)&&(S=tn(S+m-(m*E+_*w)+g),x=tn(x+_-(m*T+_*y)+p)),(r||s)&&(A=h.getBBox(),S=tn(S+r/100*A.width),x=tn(x+s/100*A.height)),A="matrix("+E+","+T+","+w+","+y+","+S+","+x+")",h.setAttribute("transform",A),v&&(h.style[Gt]=A)},uL=function(e,t,i,r,s){var a=360,o=Rn(s),l=parseFloat(s)*(o&&~s.indexOf("rad")?Ea:1),u=l-r,c=r+u+"deg",d,f;return o&&(d=s.split("_")[1],d==="short"&&(u%=a,u!==u%(a/2)&&(u+=u<0?a:-a)),d==="cw"&&u<0?u=(u+a*Bx)%a-~~(u/a)*a:d==="ccw"&&u>0&&(u=(u-a*Bx)%a-~~(u/a)*a)),e._pt=f=new yi(e._pt,t,i,r,u,XD),f.e=c,f.u="deg",e._props.push(i),f},Yx=function(e,t){for(var i in t)e[i]=t[i];return e},cL=function(e,t,i){var r=Yx({},i._gsap),s="perspective,force3D,transformOrigin,svgOrigin",a=i.style,o,l,u,c,d,f,h,m;r.svg?(u=i.getAttribute("transform"),i.setAttribute("transform",""),a[Gt]=t,o=nc(i,1),oa(i,Gt),i.setAttribute("transform",u)):(u=getComputedStyle(i)[Gt],a[Gt]=t,o=nc(i,1),a[Gt]=u);for(l in xs)u=r[l],c=o[l],u!==c&&s.indexOf(l)<0&&(h=Wn(u),m=Wn(c),d=h!==m?la(i,l,u,m):parseFloat(u),f=parseFloat(c),e._pt=new yi(e._pt,o,l,d,f-d,Sg),e._pt.u=m||0,e._props.push(l));Yx(o,r)};xi("padding,margin,Width,Radius",function(n,e){var t="Top",i="Right",r="Bottom",s="Left",a=(e<3?[t,i,r,s]:[t+s,t+i,r+i,r+s]).map(function(o){return e<2?n+o:"border"+o+n});Td[e>1?"border"+n:n]=function(o,l,u,c,d){var f,h;if(arguments.length<4)return f=a.map(function(m){return es(o,m,u)}),h=f.join(" "),h.split(f[0]).length===5?f[0]:h;f=(c+"").split(" "),h={},a.forEach(function(m,_){return h[m]=f[_]=f[_]||f[(_-1)/2|0]}),o.init(l,h,d)}});var gE={name:"css",register:Eg,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,i,r,s){var a=this._props,o=e.style,l=i.vars.startAt,u,c,d,f,h,m,_,g,p,v,S,x,E,T,w,y,A;i_||Eg(),this.styles=this.styles||uE(e),y=this.styles.props,this.tween=i;for(_ in t)if(_!=="autoRound"&&(c=t[_],!(Pi[_]&&QM(_,t,i,r,e,s)))){if(h=typeof c,m=Td[_],h==="function"&&(c=c.call(i,r,e,s),h=typeof c),h==="string"&&~c.indexOf("random(")&&(c=Qu(c)),m)m(this,e,_,c,i)&&(w=1);else if(_.substr(0,2)==="--")u=(getComputedStyle(e).getPropertyValue(_)+"").trim(),c+="",ta.lastIndex=0,ta.test(u)||(g=Wn(u),p=Wn(c),p?g!==p&&(u=la(e,_,u,p)+p):g&&(c+=g)),this.add(o,"setProperty",u,c,r,s,0,0,_),a.push(_),y.push(_,0,o[_]);else if(h!=="undefined"){if(l&&_ in l?(u=typeof l[_]=="function"?l[_].call(i,r,e,s):l[_],Rn(u)&&~u.indexOf("random(")&&(u=Qu(u)),Wn(u+"")||u==="auto"||(u+=Bi.units[_]||Wn(es(e,_))||""),(u+"").charAt(1)==="="&&(u=es(e,_))):u=es(e,_),f=parseFloat(u),v=h==="string"&&c.charAt(1)==="="&&c.substr(0,2),v&&(c=c.substr(2)),d=parseFloat(c),_ in Ur&&(_==="autoAlpha"&&(f===1&&es(e,"visibility")==="hidden"&&d&&(f=0),y.push("visibility",0,o.visibility),Gs(this,o,"visibility",f?"inherit":"hidden",d?"inherit":"hidden",!d)),_!=="scale"&&_!=="transform"&&(_=Ur[_],~_.indexOf(",")&&(_=_.split(",")[0]))),S=_ in xs,S){if(this.styles.save(_),A=c,h==="string"&&c.substring(0,6)==="var(--"){if(c=Fi(e,c.substring(4,c.indexOf(")"))),c.substring(0,5)==="calc("){var R=e.style.perspective;e.style.perspective=c,c=Fi(e,"perspective"),R?e.style.perspective=R:oa(e,"perspective")}d=parseFloat(c)}if(x||(E=e._gsap,E.renderTransform&&!t.parseTransform||nc(e,t.parseTransform),T=t.smoothOrigin!==!1&&E.smooth,x=this._pt=new yi(this._pt,o,Gt,0,1,E.renderTransform,E,0,-1),x.dep=1),_==="scale")this._pt=new yi(this._pt,E,"scaleY",E.scaleY,(v?el(E.scaleY,v+d):d)-E.scaleY||0,Sg),this._pt.u=0,a.push("scaleY",_),_+="X";else if(_==="transformOrigin"){y.push(Si,0,o[Si]),c=sL(c),E.svg?Tg(e,c,0,T,0,this):(p=parseFloat(c.split(" ")[2])||0,p!==E.zOrigin&&Gs(this,E,"zOrigin",E.zOrigin,p),Gs(this,o,_,wd(u),wd(c)));continue}else if(_==="svgOrigin"){Tg(e,c,1,T,0,this);continue}else if(_ in hE){uL(this,E,_,f,v?el(f,v+c):c);continue}else if(_==="smoothOrigin"){Gs(this,E,"smooth",E.smooth,c);continue}else if(_==="force3D"){E[_]=c;continue}else if(_==="transform"){cL(this,c,e);continue}}else _ in o||(_=Ml(_)||_);if(S||(d||d===0)&&(f||f===0)&&!WD.test(c)&&_ in o)g=(u+"").substr((f+"").length),d||(d=0),p=Wn(c)||(_ in Bi.units?Bi.units[_]:g),g!==p&&(f=la(e,_,u,p)),this._pt=new yi(this._pt,S?E:o,_,f,(v?el(f,v+d):d)-f,!S&&(p==="px"||_==="zIndex")&&t.autoRound!==!1?$D:Sg),this._pt.u=p||0,S&&A!==c?(this._pt.b=u,this._pt.e=A,this._pt.r=qD):g!==p&&p!=="%"&&(this._pt.b=u,this._pt.r=YD);else if(_ in o)rL.call(this,e,_,u,v?v+c:c);else if(_ in e)this.add(e,_,u||e[_],v?v+c:c,r,s);else if(_!=="parseTransform"){q0(_,c);continue}S||(_ in o?y.push(_,0,o[_]):typeof e[_]=="function"?y.push(_,2,e[_]()):y.push(_,1,u||e[_])),a.push(_)}}w&&rE(this)},render:function(e,t){if(t.tween._time||!r_())for(var i=t._pt;i;)i.r(e,i.d),i=i._next;else t.styles.revert()},get:es,aliases:Ur,getSetter:function(e,t,i){var r=Ur[t];return r&&r.indexOf(",")<0&&(t=r),t in xs&&t!==Si&&(e._gsap.x||es(e,"x"))?i&&kx===i?t==="scale"?QD:jD:(kx=i||{})&&(t==="scale"?JD:eL):e.style&&!W0(e.style[t])?KD:~t.indexOf("-")?ZD:t_(e,t)},core:{_removeProperty:oa,_getMatrix:a_}};Mi.utils.checkPrefix=Ml;Mi.core.getStyleSaver=uE;(function(n,e,t,i){var r=xi(n+","+e+","+t,function(s){xs[s]=1});xi(e,function(s){Bi.units[s]="deg",hE[s]=1}),Ur[r[13]]=n+","+e,xi(i,function(s){var a=s.split(":");Ur[a[1]]=r[a[0]]})})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");xi("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(n){Bi.units[n]="px"});Mi.registerPlugin(gE);var ln=Mi.registerPlugin(gE)||Mi;ln.core.Tween;const fL=({gridSize:n=10,cubeSize:e,maxAngle:t=45,radius:i=3,easing:r="power3.out",duration:s={enter:.3,leave:.6},cellGap:a,borderStyle:o="1px solid #fff",faceColor:l="#120F17",shadow:u=!1,autoAnimate:c=!0,rippleOnClick:d=!0,rippleColor:f="#fff",rippleSpeed:h=2})=>{const m=Ye.useRef(null),_=Ye.useRef(null),g=Ye.useRef(null),p=Ye.useRef(!1),v=Ye.useRef({x:0,y:0}),S=Ye.useRef({x:0,y:0}),x=Ye.useRef(null),E=typeof a=="number"?`${a}px`:(a==null?void 0:a.col)!==void 0?`${a.col}px`:"5%",T=typeof a=="number"?`${a}px`:(a==null?void 0:a.row)!==void 0?`${a.row}px`:"5%",w=s.enter,y=s.leave,A=Ye.useCallback((O,b)=>{m.current&&m.current.querySelectorAll(".cube").forEach(Q=>{const te=+Q.dataset.row,Oe=+Q.dataset.col,be=Math.hypot(te-O,Oe-b);if(be<=i){const $=(1-be/i)*t;ln.to(Q,{duration:w,ease:r,overwrite:!0,rotateX:-$,rotateY:$})}else ln.to(Q,{duration:y,ease:"power3.out",overwrite:!0,rotateX:0,rotateY:0})})},[i,t,w,y,r]),R=Ye.useCallback(O=>{p.current=!0,g.current&&clearTimeout(g.current);const b=m.current.getBoundingClientRect(),Q=b.width/n,te=b.height/n,Oe=(O.clientX-b.left)/Q,be=(O.clientY-b.top)/te;_.current&&cancelAnimationFrame(_.current),_.current=requestAnimationFrame(()=>A(be,Oe)),g.current=setTimeout(()=>{p.current=!1},3e3)},[n,A]),D=Ye.useCallback(()=>{m.current&&m.current.querySelectorAll(".cube").forEach(O=>ln.to(O,{duration:y,rotateX:0,rotateY:0,ease:"power3.out"}))},[y]),L=Ye.useCallback(O=>{O.preventDefault(),p.current=!0,g.current&&clearTimeout(g.current);const b=m.current.getBoundingClientRect(),Q=b.width/n,te=b.height/n,Oe=O.touches[0],be=(Oe.clientX-b.left)/Q,Ce=(Oe.clientY-b.top)/te;_.current&&cancelAnimationFrame(_.current),_.current=requestAnimationFrame(()=>A(Ce,be)),g.current=setTimeout(()=>{p.current=!1},3e3)},[n,A]),z=Ye.useCallback(()=>{p.current=!0},[]),I=Ye.useCallback(()=>{m.current&&D()},[D]),F=Ye.useCallback(O=>{if(!d||!m.current)return;const b=m.current.getBoundingClientRect(),Q=b.width/n,te=b.height/n,Oe=O.clientX||O.touches&&O.touches[0].clientX,be=O.clientY||O.touches&&O.touches[0].clientY,Ce=Math.floor((Oe-b.left)/Q),$=Math.floor((be-b.top)/te),se=.15,re=.3,Ae=.6,De=se/h,ye=re/h,je=Ae/h,me={};m.current.querySelectorAll(".cube").forEach(Re=>{const Ne=+Re.dataset.row,ke=+Re.dataset.col,W=Math.hypot(Ne-$,ke-Ce),et=Math.round(W);me[et]||(me[et]=[]),me[et].push(Re)}),Object.keys(me).map(Number).sort((Re,Ne)=>Re-Ne).forEach(Re=>{const Ne=Re*De,ke=me[Re].flatMap(W=>Array.from(W.querySelectorAll(".cube-face")));ln.to(ke,{backgroundColor:f,duration:ye,delay:Ne,ease:"power3.out"}),ln.to(ke,{backgroundColor:l,duration:ye,delay:Ne+ye+je,ease:"power3.out"})})},[d,n,l,f,h]);Ye.useEffect(()=>{if(!c||!m.current)return;v.current={x:Math.random()*n,y:Math.random()*n},S.current={x:Math.random()*n,y:Math.random()*n};const O=.02,b=()=>{if(!p.current){const Q=v.current,te=S.current;Q.x+=(te.x-Q.x)*O,Q.y+=(te.y-Q.y)*O,A(Q.y,Q.x),Math.hypot(Q.x-te.x,Q.y-te.y)<.1&&(S.current={x:Math.random()*n,y:Math.random()*n})}x.current=requestAnimationFrame(b)};return x.current=requestAnimationFrame(b),()=>{x.current!=null&&cancelAnimationFrame(x.current)}},[c,n,A]),Ye.useEffect(()=>{const O=m.current;if(O)return O.addEventListener("pointermove",R),O.addEventListener("pointerleave",D),O.addEventListener("click",F),O.addEventListener("touchmove",L,{passive:!1}),O.addEventListener("touchstart",z,{passive:!0}),O.addEventListener("touchend",I,{passive:!0}),()=>{O.removeEventListener("pointermove",R),O.removeEventListener("pointerleave",D),O.removeEventListener("click",F),O.removeEventListener("touchmove",L),O.removeEventListener("touchstart",z),O.removeEventListener("touchend",I),_.current!=null&&cancelAnimationFrame(_.current),g.current&&clearTimeout(g.current)}},[R,D,F,L,z,I]);const G=Array.from({length:n}),U={gridTemplateColumns:e?`repeat(${n}, ${e}px)`:`repeat(${n}, 1fr)`,gridTemplateRows:e?`repeat(${n}, ${e}px)`:`repeat(${n}, 1fr)`,columnGap:E,rowGap:T},N={"--cube-face-border":o,"--cube-face-bg":l,"--cube-face-shadow":u===!0?"0 0 6px rgba(0,0,0,.5)":u||"none",...e?{width:`${n*e}px`,height:`${n*e}px`}:{}};return j.jsx("div",{className:"default-animation",style:N,children:j.jsx("div",{ref:m,className:"default-animation--scene",style:U,children:G.map((O,b)=>G.map((Q,te)=>j.jsxs("div",{className:"cube","data-row":b,"data-col":te,children:[j.jsx("div",{className:"cube-face cube-face--top"}),j.jsx("div",{className:"cube-face cube-face--bottom"}),j.jsx("div",{className:"cube-face cube-face--left"}),j.jsx("div",{className:"cube-face cube-face--right"}),j.jsx("div",{className:"cube-face cube-face--front"}),j.jsx("div",{className:"cube-face cube-face--back"})]},`${b}-${te}`)))})})};function xu(n){let e=n[0],t=n[1],i=n[2];return Math.sqrt(e*e+t*t+i*i)}function wg(n,e){return n[0]=e[0],n[1]=e[1],n[2]=e[2],n}function dL(n,e,t,i){return n[0]=e,n[1]=t,n[2]=i,n}function qx(n,e,t){return n[0]=e[0]+t[0],n[1]=e[1]+t[1],n[2]=e[2]+t[2],n}function $x(n,e,t){return n[0]=e[0]-t[0],n[1]=e[1]-t[1],n[2]=e[2]-t[2],n}function hL(n,e,t){return n[0]=e[0]*t[0],n[1]=e[1]*t[1],n[2]=e[2]*t[2],n}function pL(n,e,t){return n[0]=e[0]/t[0],n[1]=e[1]/t[1],n[2]=e[2]/t[2],n}function _p(n,e,t){return n[0]=e[0]*t,n[1]=e[1]*t,n[2]=e[2]*t,n}function mL(n,e){let t=e[0]-n[0],i=e[1]-n[1],r=e[2]-n[2];return Math.sqrt(t*t+i*i+r*r)}function gL(n,e){let t=e[0]-n[0],i=e[1]-n[1],r=e[2]-n[2];return t*t+i*i+r*r}function Kx(n){let e=n[0],t=n[1],i=n[2];return e*e+t*t+i*i}function _L(n,e){return n[0]=-e[0],n[1]=-e[1],n[2]=-e[2],n}function vL(n,e){return n[0]=1/e[0],n[1]=1/e[1],n[2]=1/e[2],n}function Ag(n,e){let t=e[0],i=e[1],r=e[2],s=t*t+i*i+r*r;return s>0&&(s=1/Math.sqrt(s)),n[0]=e[0]*s,n[1]=e[1]*s,n[2]=e[2]*s,n}function _E(n,e){return n[0]*e[0]+n[1]*e[1]+n[2]*e[2]}function Zx(n,e,t){let i=e[0],r=e[1],s=e[2],a=t[0],o=t[1],l=t[2];return n[0]=r*l-s*o,n[1]=s*a-i*l,n[2]=i*o-r*a,n}function xL(n,e,t,i){let r=e[0],s=e[1],a=e[2];return n[0]=r+i*(t[0]-r),n[1]=s+i*(t[1]-s),n[2]=a+i*(t[2]-a),n}function yL(n,e,t,i,r){const s=Math.exp(-i*r);let a=e[0],o=e[1],l=e[2];return n[0]=t[0]+(a-t[0])*s,n[1]=t[1]+(o-t[1])*s,n[2]=t[2]+(l-t[2])*s,n}function SL(n,e,t){let i=e[0],r=e[1],s=e[2],a=t[3]*i+t[7]*r+t[11]*s+t[15];return a=a||1,n[0]=(t[0]*i+t[4]*r+t[8]*s+t[12])/a,n[1]=(t[1]*i+t[5]*r+t[9]*s+t[13])/a,n[2]=(t[2]*i+t[6]*r+t[10]*s+t[14])/a,n}function ML(n,e,t){let i=e[0],r=e[1],s=e[2],a=t[3]*i+t[7]*r+t[11]*s+t[15];return a=a||1,n[0]=(t[0]*i+t[4]*r+t[8]*s)/a,n[1]=(t[1]*i+t[5]*r+t[9]*s)/a,n[2]=(t[2]*i+t[6]*r+t[10]*s)/a,n}function EL(n,e,t){let i=e[0],r=e[1],s=e[2];return n[0]=i*t[0]+r*t[3]+s*t[6],n[1]=i*t[1]+r*t[4]+s*t[7],n[2]=i*t[2]+r*t[5]+s*t[8],n}function TL(n,e,t){let i=e[0],r=e[1],s=e[2],a=t[0],o=t[1],l=t[2],u=t[3],c=o*s-l*r,d=l*i-a*s,f=a*r-o*i,h=o*f-l*d,m=l*c-a*f,_=a*d-o*c,g=u*2;return c*=g,d*=g,f*=g,h*=2,m*=2,_*=2,n[0]=i+c+h,n[1]=r+d+m,n[2]=s+f+_,n}const wL=function(){const n=[0,0,0],e=[0,0,0];return function(t,i){wg(n,t),wg(e,i),Ag(n,n),Ag(e,e);let r=_E(n,e);return r>1?0:r<-1?Math.PI:Math.acos(r)}}();function AL(n,e){return n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2]}class _r extends Array{constructor(e=0,t=e,i=e){return super(e,t,i),this}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this[0]=e}set y(e){this[1]=e}set z(e){this[2]=e}set(e,t=e,i=e){return e.length?this.copy(e):(dL(this,e,t,i),this)}copy(e){return wg(this,e),this}add(e,t){return t?qx(this,e,t):qx(this,this,e),this}sub(e,t){return t?$x(this,e,t):$x(this,this,e),this}multiply(e){return e.length?hL(this,this,e):_p(this,this,e),this}divide(e){return e.length?pL(this,this,e):_p(this,this,1/e),this}inverse(e=this){return vL(this,e),this}len(){return xu(this)}distance(e){return e?mL(this,e):xu(this)}squaredLen(){return Kx(this)}squaredDistance(e){return e?gL(this,e):Kx(this)}negate(e=this){return _L(this,e),this}cross(e,t){return t?Zx(this,e,t):Zx(this,this,e),this}scale(e){return _p(this,this,e),this}normalize(){return Ag(this,this),this}dot(e){return _E(this,e)}equals(e){return AL(this,e)}applyMatrix3(e){return EL(this,this,e),this}applyMatrix4(e){return SL(this,this,e),this}scaleRotateMatrix4(e){return ML(this,this,e),this}applyQuaternion(e){return TL(this,this,e),this}angle(e){return wL(this,e)}lerp(e,t){return xL(this,this,e,t),this}smoothLerp(e,t,i){return yL(this,this,e,t,i),this}clone(){return new _r(this[0],this[1],this[2])}fromArray(e,t=0){return this[0]=e[t],this[1]=e[t+1],this[2]=e[t+2],this}toArray(e=[],t=0){return e[t]=this[0],e[t+1]=this[1],e[t+2]=this[2],e}transformDirection(e){const t=this[0],i=this[1],r=this[2];return this[0]=e[0]*t+e[4]*i+e[8]*r,this[1]=e[1]*t+e[5]*i+e[9]*r,this[2]=e[2]*t+e[6]*i+e[10]*r,this.normalize()}}const jx=new _r;let CL=1,RL=1,Qx=!1;class bL{constructor(e,t={}){e.canvas||console.error("gl not passed as first argument to Geometry"),this.gl=e,this.attributes=t,this.id=CL++,this.VAOs={},this.drawRange={start:0,count:0},this.instancedCount=0,this.gl.renderer.bindVertexArray(null),this.gl.renderer.currentGeometry=null,this.glState=this.gl.renderer.state;for(let i in t)this.addAttribute(i,t[i])}addAttribute(e,t){if(this.attributes[e]=t,t.id=RL++,t.size=t.size||1,t.type=t.type||(t.data.constructor===Float32Array?this.gl.FLOAT:t.data.constructor===Uint16Array?this.gl.UNSIGNED_SHORT:this.gl.UNSIGNED_INT),t.target=e==="index"?this.gl.ELEMENT_ARRAY_BUFFER:this.gl.ARRAY_BUFFER,t.normalized=t.normalized||!1,t.stride=t.stride||0,t.offset=t.offset||0,t.count=t.count||(t.stride?t.data.byteLength/t.stride:t.data.length/t.size),t.divisor=t.instanced||0,t.needsUpdate=!1,t.usage=t.usage||this.gl.STATIC_DRAW,t.buffer||this.updateAttribute(t),t.divisor){if(this.isInstanced=!0,this.instancedCount&&this.instancedCount!==t.count*t.divisor)return console.warn("geometry has multiple instanced buffers of different length"),this.instancedCount=Math.min(this.instancedCount,t.count*t.divisor);this.instancedCount=t.count*t.divisor}else e==="index"?this.drawRange.count=t.count:this.attributes.index||(this.drawRange.count=Math.max(this.drawRange.count,t.count))}updateAttribute(e){const t=!e.buffer;t&&(e.buffer=this.gl.createBuffer()),this.glState.boundBuffer!==e.buffer&&(this.gl.bindBuffer(e.target,e.buffer),this.glState.boundBuffer=e.buffer),t?this.gl.bufferData(e.target,e.data,e.usage):this.gl.bufferSubData(e.target,0,e.data),e.needsUpdate=!1}setIndex(e){this.addAttribute("index",e)}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}setInstancedCount(e){this.instancedCount=e}createVAO(e){this.VAOs[e.attributeOrder]=this.gl.renderer.createVertexArray(),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.bindAttributes(e)}bindAttributes(e){e.attributeLocations.forEach((t,{name:i,type:r})=>{if(!this.attributes[i]){console.warn(`active attribute ${i} not being supplied`);return}const s=this.attributes[i];this.gl.bindBuffer(s.target,s.buffer),this.glState.boundBuffer=s.buffer;let a=1;r===35674&&(a=2),r===35675&&(a=3),r===35676&&(a=4);const o=s.size/a,l=a===1?0:a*a*4,u=a===1?0:a*4;for(let c=0;c<a;c++)this.gl.vertexAttribPointer(t+c,o,s.type,s.normalized,s.stride+l,s.offset+c*u),this.gl.enableVertexAttribArray(t+c),this.gl.renderer.vertexAttribDivisor(t+c,s.divisor)}),this.attributes.index&&this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.attributes.index.buffer)}draw({program:e,mode:t=this.gl.TRIANGLES}){var r;this.gl.renderer.currentGeometry!==`${this.id}_${e.attributeOrder}`&&(this.VAOs[e.attributeOrder]||this.createVAO(e),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.gl.renderer.currentGeometry=`${this.id}_${e.attributeOrder}`),e.attributeLocations.forEach((s,{name:a})=>{const o=this.attributes[a];o.needsUpdate&&this.updateAttribute(o)});let i=2;((r=this.attributes.index)==null?void 0:r.type)===this.gl.UNSIGNED_INT&&(i=4),this.isInstanced?this.attributes.index?this.gl.renderer.drawElementsInstanced(t,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*i,this.instancedCount):this.gl.renderer.drawArraysInstanced(t,this.drawRange.start,this.drawRange.count,this.instancedCount):this.attributes.index?this.gl.drawElements(t,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*i):this.gl.drawArrays(t,this.drawRange.start,this.drawRange.count)}getPosition(){const e=this.attributes.position;if(e.data)return e;if(!Qx)return console.warn("No position buffer data found to compute bounds"),Qx=!0}computeBoundingBox(e){e||(e=this.getPosition());const t=e.data,i=e.size;this.bounds||(this.bounds={min:new _r,max:new _r,center:new _r,scale:new _r,radius:1/0});const r=this.bounds.min,s=this.bounds.max,a=this.bounds.center,o=this.bounds.scale;r.set(1/0),s.set(-1/0);for(let l=0,u=t.length;l<u;l+=i){const c=t[l],d=t[l+1],f=t[l+2];r.x=Math.min(c,r.x),r.y=Math.min(d,r.y),r.z=Math.min(f,r.z),s.x=Math.max(c,s.x),s.y=Math.max(d,s.y),s.z=Math.max(f,s.z)}o.sub(s,r),a.add(r,s).divide(2)}computeBoundingSphere(e){e||(e=this.getPosition());const t=e.data,i=e.size;this.bounds||this.computeBoundingBox(e);let r=0;for(let s=0,a=t.length;s<a;s+=i)jx.fromArray(t,s),r=Math.max(r,this.bounds.center.squaredDistance(jx));this.bounds.radius=Math.sqrt(r)}remove(){for(let e in this.VAOs)this.gl.renderer.deleteVertexArray(this.VAOs[e]),delete this.VAOs[e];for(let e in this.attributes)this.gl.deleteBuffer(this.attributes[e].buffer),delete this.attributes[e]}}let PL=1;const Jx={};class DL{constructor(e,{vertex:t,fragment:i,uniforms:r={},transparent:s=!1,cullFace:a=e.BACK,frontFace:o=e.CCW,depthTest:l=!0,depthWrite:u=!0,depthFunc:c=e.LEQUAL}={}){e.canvas||console.error("gl not passed as first argument to Program"),this.gl=e,this.uniforms=r,this.id=PL++,t||console.warn("vertex shader not supplied"),i||console.warn("fragment shader not supplied"),this.transparent=s,this.cullFace=a,this.frontFace=o,this.depthTest=l,this.depthWrite=u,this.depthFunc=c,this.blendFunc={},this.blendEquation={},this.stencilFunc={},this.stencilOp={},this.transparent&&!this.blendFunc.src&&(this.gl.renderer.premultipliedAlpha?this.setBlendFunc(this.gl.ONE,this.gl.ONE_MINUS_SRC_ALPHA):this.setBlendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA)),this.vertexShader=e.createShader(e.VERTEX_SHADER),this.fragmentShader=e.createShader(e.FRAGMENT_SHADER),this.program=e.createProgram(),e.attachShader(this.program,this.vertexShader),e.attachShader(this.program,this.fragmentShader),this.setShaders({vertex:t,fragment:i})}setShaders({vertex:e,fragment:t}){if(e&&(this.gl.shaderSource(this.vertexShader,e),this.gl.compileShader(this.vertexShader),this.gl.getShaderInfoLog(this.vertexShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.vertexShader)}
Vertex Shader
${ey(e)}`)),t&&(this.gl.shaderSource(this.fragmentShader,t),this.gl.compileShader(this.fragmentShader),this.gl.getShaderInfoLog(this.fragmentShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.fragmentShader)}
Fragment Shader
${ey(t)}`)),this.gl.linkProgram(this.program),!this.gl.getProgramParameter(this.program,this.gl.LINK_STATUS))return console.warn(this.gl.getProgramInfoLog(this.program));this.uniformLocations=new Map;let i=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_UNIFORMS);for(let a=0;a<i;a++){let o=this.gl.getActiveUniform(this.program,a);this.uniformLocations.set(o,this.gl.getUniformLocation(this.program,o.name));const l=o.name.match(/(\w+)/g);o.uniformName=l[0],o.nameComponents=l.slice(1)}this.attributeLocations=new Map;const r=[],s=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_ATTRIBUTES);for(let a=0;a<s;a++){const o=this.gl.getActiveAttrib(this.program,a),l=this.gl.getAttribLocation(this.program,o.name);l!==-1&&(r[l]=o.name,this.attributeLocations.set(o,l))}this.attributeOrder=r.join("")}setBlendFunc(e,t,i,r){this.blendFunc.src=e,this.blendFunc.dst=t,this.blendFunc.srcAlpha=i,this.blendFunc.dstAlpha=r,e&&(this.transparent=!0)}setBlendEquation(e,t){this.blendEquation.modeRGB=e,this.blendEquation.modeAlpha=t}setStencilFunc(e,t,i){this.stencilRef=t,this.stencilFunc.func=e,this.stencilFunc.ref=t,this.stencilFunc.mask=i}setStencilOp(e,t,i){this.stencilOp.stencilFail=e,this.stencilOp.depthFail=t,this.stencilOp.depthPass=i}applyState(){this.depthTest?this.gl.renderer.enable(this.gl.DEPTH_TEST):this.gl.renderer.disable(this.gl.DEPTH_TEST),this.cullFace?this.gl.renderer.enable(this.gl.CULL_FACE):this.gl.renderer.disable(this.gl.CULL_FACE),this.blendFunc.src?this.gl.renderer.enable(this.gl.BLEND):this.gl.renderer.disable(this.gl.BLEND),this.cullFace&&this.gl.renderer.setCullFace(this.cullFace),this.gl.renderer.setFrontFace(this.frontFace),this.gl.renderer.setDepthMask(this.depthWrite),this.gl.renderer.setDepthFunc(this.depthFunc),this.blendFunc.src&&this.gl.renderer.setBlendFunc(this.blendFunc.src,this.blendFunc.dst,this.blendFunc.srcAlpha,this.blendFunc.dstAlpha),this.gl.renderer.setBlendEquation(this.blendEquation.modeRGB,this.blendEquation.modeAlpha),this.stencilFunc.func||this.stencilOp.stencilFail?this.gl.renderer.enable(this.gl.STENCIL_TEST):this.gl.renderer.disable(this.gl.STENCIL_TEST),this.gl.renderer.setStencilFunc(this.stencilFunc.func,this.stencilFunc.ref,this.stencilFunc.mask),this.gl.renderer.setStencilOp(this.stencilOp.stencilFail,this.stencilOp.depthFail,this.stencilOp.depthPass)}use({flipFaces:e=!1}={}){let t=-1;this.gl.renderer.state.currentProgram===this.id||(this.gl.useProgram(this.program),this.gl.renderer.state.currentProgram=this.id),this.uniformLocations.forEach((r,s)=>{let a=this.uniforms[s.uniformName];for(const o of s.nameComponents){if(!a)break;if(o in a)a=a[o];else{if(Array.isArray(a.value))break;a=void 0;break}}if(!a)return ty(`Active uniform ${s.name} has not been supplied`);if(a&&a.value===void 0)return ty(`${s.name} uniform is missing a value parameter`);if(a.value.texture)return t=t+1,a.value.update(t),vp(this.gl,s.type,r,t);if(a.value.length&&a.value[0].texture){const o=[];return a.value.forEach(l=>{t=t+1,l.update(t),o.push(t)}),vp(this.gl,s.type,r,o)}vp(this.gl,s.type,r,a.value)}),this.applyState(),e&&this.gl.renderer.setFrontFace(this.frontFace===this.gl.CCW?this.gl.CW:this.gl.CCW)}remove(){this.gl.deleteProgram(this.program)}}function vp(n,e,t,i){i=i.length?LL(i):i;const r=n.renderer.state.uniformLocations.get(t);if(i.length)if(r===void 0||r.length!==i.length)n.renderer.state.uniformLocations.set(t,i.slice(0));else{if(NL(r,i))return;r.set?r.set(i):IL(r,i),n.renderer.state.uniformLocations.set(t,r)}else{if(r===i)return;n.renderer.state.uniformLocations.set(t,i)}switch(e){case 5126:return i.length?n.uniform1fv(t,i):n.uniform1f(t,i);case 35664:return n.uniform2fv(t,i);case 35665:return n.uniform3fv(t,i);case 35666:return n.uniform4fv(t,i);case 35670:case 5124:case 35678:case 36306:case 35680:case 36289:return i.length?n.uniform1iv(t,i):n.uniform1i(t,i);case 35671:case 35667:return n.uniform2iv(t,i);case 35672:case 35668:return n.uniform3iv(t,i);case 35673:case 35669:return n.uniform4iv(t,i);case 35674:return n.uniformMatrix2fv(t,!1,i);case 35675:return n.uniformMatrix3fv(t,!1,i);case 35676:return n.uniformMatrix4fv(t,!1,i)}}function ey(n){let e=n.split(`
`);for(let t=0;t<e.length;t++)e[t]=t+1+": "+e[t];return e.join(`
`)}function LL(n){const e=n.length,t=n[0].length;if(t===void 0)return n;const i=e*t;let r=Jx[i];r||(Jx[i]=r=new Float32Array(i));for(let s=0;s<e;s++)r.set(n[s],s*t);return r}function NL(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function IL(n,e){for(let t=0,i=n.length;t<i;t++)n[t]=e[t]}let xp=0;function ty(n){xp>100||(console.warn(n),xp++,xp>100&&console.warn("More than 100 program warnings - stopping logs."))}const yp=new _r;let UL=1;class FL{constructor({canvas:e=document.createElement("canvas"),width:t=300,height:i=150,dpr:r=1,alpha:s=!1,depth:a=!0,stencil:o=!1,antialias:l=!1,premultipliedAlpha:u=!1,preserveDrawingBuffer:c=!1,powerPreference:d="default",autoClear:f=!0,webgl:h=2}={}){const m={alpha:s,depth:a,stencil:o,antialias:l,premultipliedAlpha:u,preserveDrawingBuffer:c,powerPreference:d};this.dpr=r,this.alpha=s,this.color=!0,this.depth=a,this.stencil=o,this.premultipliedAlpha=u,this.autoClear=f,this.id=UL++,h===2&&(this.gl=e.getContext("webgl2",m)),this.isWebgl2=!!this.gl,this.gl||(this.gl=e.getContext("webgl",m)),this.gl||console.error("unable to create webgl context"),this.gl.renderer=this,this.setSize(t,i),this.state={},this.state.blendFunc={src:this.gl.ONE,dst:this.gl.ZERO},this.state.blendEquation={modeRGB:this.gl.FUNC_ADD},this.state.cullFace=!1,this.state.frontFace=this.gl.CCW,this.state.depthMask=!0,this.state.depthFunc=this.gl.LEQUAL,this.state.premultiplyAlpha=!1,this.state.flipY=!1,this.state.unpackAlignment=4,this.state.framebuffer=null,this.state.viewport={x:0,y:0,width:null,height:null},this.state.textureUnits=[],this.state.activeTextureUnit=0,this.state.boundBuffer=null,this.state.uniformLocations=new Map,this.state.currentProgram=null,this.extensions={},this.isWebgl2?(this.getExtension("EXT_color_buffer_float"),this.getExtension("OES_texture_float_linear")):(this.getExtension("OES_texture_float"),this.getExtension("OES_texture_float_linear"),this.getExtension("OES_texture_half_float"),this.getExtension("OES_texture_half_float_linear"),this.getExtension("OES_element_index_uint"),this.getExtension("OES_standard_derivatives"),this.getExtension("EXT_sRGB"),this.getExtension("WEBGL_depth_texture"),this.getExtension("WEBGL_draw_buffers")),this.getExtension("WEBGL_compressed_texture_astc"),this.getExtension("EXT_texture_compression_bptc"),this.getExtension("WEBGL_compressed_texture_s3tc"),this.getExtension("WEBGL_compressed_texture_etc1"),this.getExtension("WEBGL_compressed_texture_pvrtc"),this.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc"),this.vertexAttribDivisor=this.getExtension("ANGLE_instanced_arrays","vertexAttribDivisor","vertexAttribDivisorANGLE"),this.drawArraysInstanced=this.getExtension("ANGLE_instanced_arrays","drawArraysInstanced","drawArraysInstancedANGLE"),this.drawElementsInstanced=this.getExtension("ANGLE_instanced_arrays","drawElementsInstanced","drawElementsInstancedANGLE"),this.createVertexArray=this.getExtension("OES_vertex_array_object","createVertexArray","createVertexArrayOES"),this.bindVertexArray=this.getExtension("OES_vertex_array_object","bindVertexArray","bindVertexArrayOES"),this.deleteVertexArray=this.getExtension("OES_vertex_array_object","deleteVertexArray","deleteVertexArrayOES"),this.drawBuffers=this.getExtension("WEBGL_draw_buffers","drawBuffers","drawBuffersWEBGL"),this.parameters={},this.parameters.maxTextureUnits=this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),this.parameters.maxAnisotropy=this.getExtension("EXT_texture_filter_anisotropic")?this.gl.getParameter(this.getExtension("EXT_texture_filter_anisotropic").MAX_TEXTURE_MAX_ANISOTROPY_EXT):0}setSize(e,t){this.width=e,this.height=t,this.gl.canvas.width=e*this.dpr,this.gl.canvas.height=t*this.dpr,this.gl.canvas.style&&Object.assign(this.gl.canvas.style,{width:e+"px",height:t+"px"})}setViewport(e,t,i=0,r=0){this.state.viewport.width===e&&this.state.viewport.height===t||(this.state.viewport.width=e,this.state.viewport.height=t,this.state.viewport.x=i,this.state.viewport.y=r,this.gl.viewport(i,r,e,t))}setScissor(e,t,i=0,r=0){this.gl.scissor(i,r,e,t)}enable(e){this.state[e]!==!0&&(this.gl.enable(e),this.state[e]=!0)}disable(e){this.state[e]!==!1&&(this.gl.disable(e),this.state[e]=!1)}setBlendFunc(e,t,i,r){this.state.blendFunc.src===e&&this.state.blendFunc.dst===t&&this.state.blendFunc.srcAlpha===i&&this.state.blendFunc.dstAlpha===r||(this.state.blendFunc.src=e,this.state.blendFunc.dst=t,this.state.blendFunc.srcAlpha=i,this.state.blendFunc.dstAlpha=r,i!==void 0?this.gl.blendFuncSeparate(e,t,i,r):this.gl.blendFunc(e,t))}setBlendEquation(e,t){e=e||this.gl.FUNC_ADD,!(this.state.blendEquation.modeRGB===e&&this.state.blendEquation.modeAlpha===t)&&(this.state.blendEquation.modeRGB=e,this.state.blendEquation.modeAlpha=t,t!==void 0?this.gl.blendEquationSeparate(e,t):this.gl.blendEquation(e))}setCullFace(e){this.state.cullFace!==e&&(this.state.cullFace=e,this.gl.cullFace(e))}setFrontFace(e){this.state.frontFace!==e&&(this.state.frontFace=e,this.gl.frontFace(e))}setDepthMask(e){this.state.depthMask!==e&&(this.state.depthMask=e,this.gl.depthMask(e))}setDepthFunc(e){this.state.depthFunc!==e&&(this.state.depthFunc=e,this.gl.depthFunc(e))}setStencilMask(e){this.state.stencilMask!==e&&(this.state.stencilMask=e,this.gl.stencilMask(e))}setStencilFunc(e,t,i){this.state.stencilFunc===e&&this.state.stencilRef===t&&this.state.stencilFuncMask===i||(this.state.stencilFunc=e||this.gl.ALWAYS,this.state.stencilRef=t||0,this.state.stencilFuncMask=i||0,this.gl.stencilFunc(e||this.gl.ALWAYS,t||0,i||0))}setStencilOp(e,t,i){this.state.stencilFail===e&&this.state.stencilDepthFail===t&&this.state.stencilDepthPass===i||(this.state.stencilFail=e,this.state.stencilDepthFail=t,this.state.stencilDepthPass=i,this.gl.stencilOp(e,t,i))}activeTexture(e){this.state.activeTextureUnit!==e&&(this.state.activeTextureUnit=e,this.gl.activeTexture(this.gl.TEXTURE0+e))}bindFramebuffer({target:e=this.gl.FRAMEBUFFER,buffer:t=null}={}){this.state.framebuffer!==t&&(this.state.framebuffer=t,this.gl.bindFramebuffer(e,t))}getExtension(e,t,i){return t&&this.gl[t]?this.gl[t].bind(this.gl):(this.extensions[e]||(this.extensions[e]=this.gl.getExtension(e)),t?this.extensions[e]?this.extensions[e][i].bind(this.extensions[e]):null:this.extensions[e])}sortOpaque(e,t){return e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.program.id!==t.program.id?e.program.id-t.program.id:e.zDepth!==t.zDepth?e.zDepth-t.zDepth:t.id-e.id}sortTransparent(e,t){return e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.zDepth!==t.zDepth?t.zDepth-e.zDepth:t.id-e.id}sortUI(e,t){return e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.program.id!==t.program.id?e.program.id-t.program.id:t.id-e.id}getRenderList({scene:e,camera:t,frustumCull:i,sort:r}){let s=[];if(t&&i&&t.updateFrustum(),e.traverse(a=>{if(!a.visible)return!0;a.draw&&(i&&a.frustumCulled&&t&&!t.frustumIntersectsMesh(a)||s.push(a))}),r){const a=[],o=[],l=[];s.forEach(u=>{u.program.transparent?u.program.depthTest?o.push(u):l.push(u):a.push(u),u.zDepth=0,!(u.renderOrder!==0||!u.program.depthTest||!t)&&(u.worldMatrix.getTranslation(yp),yp.applyMatrix4(t.projectionViewMatrix),u.zDepth=yp.z)}),a.sort(this.sortOpaque),o.sort(this.sortTransparent),l.sort(this.sortUI),s=a.concat(o,l)}return s}render({scene:e,camera:t,target:i=null,update:r=!0,sort:s=!0,frustumCull:a=!0,clear:o}){i===null?(this.bindFramebuffer(),this.setViewport(this.width*this.dpr,this.height*this.dpr)):(this.bindFramebuffer(i),this.setViewport(i.width,i.height)),(o||this.autoClear&&o!==!1)&&(this.depth&&(!i||i.depth)&&(this.enable(this.gl.DEPTH_TEST),this.setDepthMask(!0)),(this.stencil||!i||i.stencil)&&(this.enable(this.gl.STENCIL_TEST),this.setStencilMask(255)),this.gl.clear((this.color?this.gl.COLOR_BUFFER_BIT:0)|(this.depth?this.gl.DEPTH_BUFFER_BIT:0)|(this.stencil?this.gl.STENCIL_BUFFER_BIT:0))),r&&e.updateMatrixWorld(),t&&t.updateMatrixWorld(),this.getRenderList({scene:e,camera:t,frustumCull:a,sort:s}).forEach(u=>{u.draw({camera:t})})}}function OL(n,e){return n[0]=e[0],n[1]=e[1],n[2]=e[2],n[3]=e[3],n}function kL(n,e,t,i,r){return n[0]=e,n[1]=t,n[2]=i,n[3]=r,n}function BL(n,e){let t=e[0],i=e[1],r=e[2],s=e[3],a=t*t+i*i+r*r+s*s;return a>0&&(a=1/Math.sqrt(a)),n[0]=t*a,n[1]=i*a,n[2]=r*a,n[3]=s*a,n}function zL(n,e){return n[0]*e[0]+n[1]*e[1]+n[2]*e[2]+n[3]*e[3]}function VL(n){return n[0]=0,n[1]=0,n[2]=0,n[3]=1,n}function HL(n,e,t){t=t*.5;let i=Math.sin(t);return n[0]=i*e[0],n[1]=i*e[1],n[2]=i*e[2],n[3]=Math.cos(t),n}function ny(n,e,t){let i=e[0],r=e[1],s=e[2],a=e[3],o=t[0],l=t[1],u=t[2],c=t[3];return n[0]=i*c+a*o+r*u-s*l,n[1]=r*c+a*l+s*o-i*u,n[2]=s*c+a*u+i*l-r*o,n[3]=a*c-i*o-r*l-s*u,n}function GL(n,e,t){t*=.5;let i=e[0],r=e[1],s=e[2],a=e[3],o=Math.sin(t),l=Math.cos(t);return n[0]=i*l+a*o,n[1]=r*l+s*o,n[2]=s*l-r*o,n[3]=a*l-i*o,n}function WL(n,e,t){t*=.5;let i=e[0],r=e[1],s=e[2],a=e[3],o=Math.sin(t),l=Math.cos(t);return n[0]=i*l-s*o,n[1]=r*l+a*o,n[2]=s*l+i*o,n[3]=a*l-r*o,n}function XL(n,e,t){t*=.5;let i=e[0],r=e[1],s=e[2],a=e[3],o=Math.sin(t),l=Math.cos(t);return n[0]=i*l+r*o,n[1]=r*l-i*o,n[2]=s*l+a*o,n[3]=a*l-s*o,n}function YL(n,e,t,i){let r=e[0],s=e[1],a=e[2],o=e[3],l=t[0],u=t[1],c=t[2],d=t[3],f,h,m,_,g;return h=r*l+s*u+a*c+o*d,h<0&&(h=-h,l=-l,u=-u,c=-c,d=-d),1-h>1e-6?(f=Math.acos(h),m=Math.sin(f),_=Math.sin((1-i)*f)/m,g=Math.sin(i*f)/m):(_=1-i,g=i),n[0]=_*r+g*l,n[1]=_*s+g*u,n[2]=_*a+g*c,n[3]=_*o+g*d,n}function qL(n,e){let t=e[0],i=e[1],r=e[2],s=e[3],a=t*t+i*i+r*r+s*s,o=a?1/a:0;return n[0]=-t*o,n[1]=-i*o,n[2]=-r*o,n[3]=s*o,n}function $L(n,e){return n[0]=-e[0],n[1]=-e[1],n[2]=-e[2],n[3]=e[3],n}function KL(n,e){let t=e[0]+e[4]+e[8],i;if(t>0)i=Math.sqrt(t+1),n[3]=.5*i,i=.5/i,n[0]=(e[5]-e[7])*i,n[1]=(e[6]-e[2])*i,n[2]=(e[1]-e[3])*i;else{let r=0;e[4]>e[0]&&(r=1),e[8]>e[r*3+r]&&(r=2);let s=(r+1)%3,a=(r+2)%3;i=Math.sqrt(e[r*3+r]-e[s*3+s]-e[a*3+a]+1),n[r]=.5*i,i=.5/i,n[3]=(e[s*3+a]-e[a*3+s])*i,n[s]=(e[s*3+r]+e[r*3+s])*i,n[a]=(e[a*3+r]+e[r*3+a])*i}return n}function ZL(n,e,t="YXZ"){let i=Math.sin(e[0]*.5),r=Math.cos(e[0]*.5),s=Math.sin(e[1]*.5),a=Math.cos(e[1]*.5),o=Math.sin(e[2]*.5),l=Math.cos(e[2]*.5);return t==="XYZ"?(n[0]=i*a*l+r*s*o,n[1]=r*s*l-i*a*o,n[2]=r*a*o+i*s*l,n[3]=r*a*l-i*s*o):t==="YXZ"?(n[0]=i*a*l+r*s*o,n[1]=r*s*l-i*a*o,n[2]=r*a*o-i*s*l,n[3]=r*a*l+i*s*o):t==="ZXY"?(n[0]=i*a*l-r*s*o,n[1]=r*s*l+i*a*o,n[2]=r*a*o+i*s*l,n[3]=r*a*l-i*s*o):t==="ZYX"?(n[0]=i*a*l-r*s*o,n[1]=r*s*l+i*a*o,n[2]=r*a*o-i*s*l,n[3]=r*a*l+i*s*o):t==="YZX"?(n[0]=i*a*l+r*s*o,n[1]=r*s*l+i*a*o,n[2]=r*a*o-i*s*l,n[3]=r*a*l-i*s*o):t==="XZY"&&(n[0]=i*a*l-r*s*o,n[1]=r*s*l-i*a*o,n[2]=r*a*o+i*s*l,n[3]=r*a*l+i*s*o),n}const jL=OL,QL=kL,JL=zL,eN=BL;class tN extends Array{constructor(e=0,t=0,i=0,r=1){super(e,t,i,r),this.onChange=()=>{},this._target=this;const s=["0","1","2","3"];return new Proxy(this,{set(a,o){const l=Reflect.set(...arguments);return l&&s.includes(o)&&a.onChange(),l}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}get w(){return this[3]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set w(e){this._target[3]=e,this.onChange()}identity(){return VL(this._target),this.onChange(),this}set(e,t,i,r){return e.length?this.copy(e):(QL(this._target,e,t,i,r),this.onChange(),this)}rotateX(e){return GL(this._target,this._target,e),this.onChange(),this}rotateY(e){return WL(this._target,this._target,e),this.onChange(),this}rotateZ(e){return XL(this._target,this._target,e),this.onChange(),this}inverse(e=this._target){return qL(this._target,e),this.onChange(),this}conjugate(e=this._target){return $L(this._target,e),this.onChange(),this}copy(e){return jL(this._target,e),this.onChange(),this}normalize(e=this._target){return eN(this._target,e),this.onChange(),this}multiply(e,t){return t?ny(this._target,e,t):ny(this._target,this._target,e),this.onChange(),this}dot(e){return JL(this._target,e)}fromMatrix3(e){return KL(this._target,e),this.onChange(),this}fromEuler(e,t){return ZL(this._target,e,e.order),t||this.onChange(),this}fromAxisAngle(e,t){return HL(this._target,e,t),this.onChange(),this}slerp(e,t){return YL(this._target,this._target,e,t),this.onChange(),this}fromArray(e,t=0){return this._target[0]=e[t],this._target[1]=e[t+1],this._target[2]=e[t+2],this._target[3]=e[t+3],this.onChange(),this}toArray(e=[],t=0){return e[t]=this[0],e[t+1]=this[1],e[t+2]=this[2],e[t+3]=this[3],e}}const nN=1e-6;function iN(n,e){return n[0]=e[0],n[1]=e[1],n[2]=e[2],n[3]=e[3],n[4]=e[4],n[5]=e[5],n[6]=e[6],n[7]=e[7],n[8]=e[8],n[9]=e[9],n[10]=e[10],n[11]=e[11],n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15],n}function rN(n,e,t,i,r,s,a,o,l,u,c,d,f,h,m,_,g){return n[0]=e,n[1]=t,n[2]=i,n[3]=r,n[4]=s,n[5]=a,n[6]=o,n[7]=l,n[8]=u,n[9]=c,n[10]=d,n[11]=f,n[12]=h,n[13]=m,n[14]=_,n[15]=g,n}function sN(n){return n[0]=1,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=1,n[6]=0,n[7]=0,n[8]=0,n[9]=0,n[10]=1,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,n}function aN(n,e){let t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],u=e[7],c=e[8],d=e[9],f=e[10],h=e[11],m=e[12],_=e[13],g=e[14],p=e[15],v=t*o-i*a,S=t*l-r*a,x=t*u-s*a,E=i*l-r*o,T=i*u-s*o,w=r*u-s*l,y=c*_-d*m,A=c*g-f*m,R=c*p-h*m,D=d*g-f*_,L=d*p-h*_,z=f*p-h*g,I=v*z-S*L+x*D+E*R-T*A+w*y;return I?(I=1/I,n[0]=(o*z-l*L+u*D)*I,n[1]=(r*L-i*z-s*D)*I,n[2]=(_*w-g*T+p*E)*I,n[3]=(f*T-d*w-h*E)*I,n[4]=(l*R-a*z-u*A)*I,n[5]=(t*z-r*R+s*A)*I,n[6]=(g*x-m*w-p*S)*I,n[7]=(c*w-f*x+h*S)*I,n[8]=(a*L-o*R+u*y)*I,n[9]=(i*R-t*L-s*y)*I,n[10]=(m*T-_*x+p*v)*I,n[11]=(d*x-c*T-h*v)*I,n[12]=(o*A-a*D-l*y)*I,n[13]=(t*D-i*A+r*y)*I,n[14]=(_*S-m*E-g*v)*I,n[15]=(c*E-d*S+f*v)*I,n):null}function vE(n){let e=n[0],t=n[1],i=n[2],r=n[3],s=n[4],a=n[5],o=n[6],l=n[7],u=n[8],c=n[9],d=n[10],f=n[11],h=n[12],m=n[13],_=n[14],g=n[15],p=e*a-t*s,v=e*o-i*s,S=e*l-r*s,x=t*o-i*a,E=t*l-r*a,T=i*l-r*o,w=u*m-c*h,y=u*_-d*h,A=u*g-f*h,R=c*_-d*m,D=c*g-f*m,L=d*g-f*_;return p*L-v*D+S*R+x*A-E*y+T*w}function iy(n,e,t){let i=e[0],r=e[1],s=e[2],a=e[3],o=e[4],l=e[5],u=e[6],c=e[7],d=e[8],f=e[9],h=e[10],m=e[11],_=e[12],g=e[13],p=e[14],v=e[15],S=t[0],x=t[1],E=t[2],T=t[3];return n[0]=S*i+x*o+E*d+T*_,n[1]=S*r+x*l+E*f+T*g,n[2]=S*s+x*u+E*h+T*p,n[3]=S*a+x*c+E*m+T*v,S=t[4],x=t[5],E=t[6],T=t[7],n[4]=S*i+x*o+E*d+T*_,n[5]=S*r+x*l+E*f+T*g,n[6]=S*s+x*u+E*h+T*p,n[7]=S*a+x*c+E*m+T*v,S=t[8],x=t[9],E=t[10],T=t[11],n[8]=S*i+x*o+E*d+T*_,n[9]=S*r+x*l+E*f+T*g,n[10]=S*s+x*u+E*h+T*p,n[11]=S*a+x*c+E*m+T*v,S=t[12],x=t[13],E=t[14],T=t[15],n[12]=S*i+x*o+E*d+T*_,n[13]=S*r+x*l+E*f+T*g,n[14]=S*s+x*u+E*h+T*p,n[15]=S*a+x*c+E*m+T*v,n}function oN(n,e,t){let i=t[0],r=t[1],s=t[2],a,o,l,u,c,d,f,h,m,_,g,p;return e===n?(n[12]=e[0]*i+e[4]*r+e[8]*s+e[12],n[13]=e[1]*i+e[5]*r+e[9]*s+e[13],n[14]=e[2]*i+e[6]*r+e[10]*s+e[14],n[15]=e[3]*i+e[7]*r+e[11]*s+e[15]):(a=e[0],o=e[1],l=e[2],u=e[3],c=e[4],d=e[5],f=e[6],h=e[7],m=e[8],_=e[9],g=e[10],p=e[11],n[0]=a,n[1]=o,n[2]=l,n[3]=u,n[4]=c,n[5]=d,n[6]=f,n[7]=h,n[8]=m,n[9]=_,n[10]=g,n[11]=p,n[12]=a*i+c*r+m*s+e[12],n[13]=o*i+d*r+_*s+e[13],n[14]=l*i+f*r+g*s+e[14],n[15]=u*i+h*r+p*s+e[15]),n}function lN(n,e,t){let i=t[0],r=t[1],s=t[2];return n[0]=e[0]*i,n[1]=e[1]*i,n[2]=e[2]*i,n[3]=e[3]*i,n[4]=e[4]*r,n[5]=e[5]*r,n[6]=e[6]*r,n[7]=e[7]*r,n[8]=e[8]*s,n[9]=e[9]*s,n[10]=e[10]*s,n[11]=e[11]*s,n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15],n}function uN(n,e,t,i){let r=i[0],s=i[1],a=i[2],o=Math.hypot(r,s,a),l,u,c,d,f,h,m,_,g,p,v,S,x,E,T,w,y,A,R,D,L,z,I,F;return Math.abs(o)<nN?null:(o=1/o,r*=o,s*=o,a*=o,l=Math.sin(t),u=Math.cos(t),c=1-u,d=e[0],f=e[1],h=e[2],m=e[3],_=e[4],g=e[5],p=e[6],v=e[7],S=e[8],x=e[9],E=e[10],T=e[11],w=r*r*c+u,y=s*r*c+a*l,A=a*r*c-s*l,R=r*s*c-a*l,D=s*s*c+u,L=a*s*c+r*l,z=r*a*c+s*l,I=s*a*c-r*l,F=a*a*c+u,n[0]=d*w+_*y+S*A,n[1]=f*w+g*y+x*A,n[2]=h*w+p*y+E*A,n[3]=m*w+v*y+T*A,n[4]=d*R+_*D+S*L,n[5]=f*R+g*D+x*L,n[6]=h*R+p*D+E*L,n[7]=m*R+v*D+T*L,n[8]=d*z+_*I+S*F,n[9]=f*z+g*I+x*F,n[10]=h*z+p*I+E*F,n[11]=m*z+v*I+T*F,e!==n&&(n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15]),n)}function cN(n,e){return n[0]=e[12],n[1]=e[13],n[2]=e[14],n}function xE(n,e){let t=e[0],i=e[1],r=e[2],s=e[4],a=e[5],o=e[6],l=e[8],u=e[9],c=e[10];return n[0]=Math.hypot(t,i,r),n[1]=Math.hypot(s,a,o),n[2]=Math.hypot(l,u,c),n}function fN(n){let e=n[0],t=n[1],i=n[2],r=n[4],s=n[5],a=n[6],o=n[8],l=n[9],u=n[10];const c=e*e+t*t+i*i,d=r*r+s*s+a*a,f=o*o+l*l+u*u;return Math.sqrt(Math.max(c,d,f))}const yE=function(){const n=[1,1,1];return function(e,t){let i=n;xE(i,t);let r=1/i[0],s=1/i[1],a=1/i[2],o=t[0]*r,l=t[1]*s,u=t[2]*a,c=t[4]*r,d=t[5]*s,f=t[6]*a,h=t[8]*r,m=t[9]*s,_=t[10]*a,g=o+d+_,p=0;return g>0?(p=Math.sqrt(g+1)*2,e[3]=.25*p,e[0]=(f-m)/p,e[1]=(h-u)/p,e[2]=(l-c)/p):o>d&&o>_?(p=Math.sqrt(1+o-d-_)*2,e[3]=(f-m)/p,e[0]=.25*p,e[1]=(l+c)/p,e[2]=(h+u)/p):d>_?(p=Math.sqrt(1+d-o-_)*2,e[3]=(h-u)/p,e[0]=(l+c)/p,e[1]=.25*p,e[2]=(f+m)/p):(p=Math.sqrt(1+_-o-d)*2,e[3]=(l-c)/p,e[0]=(h+u)/p,e[1]=(f+m)/p,e[2]=.25*p),e}}();function dN(n,e,t,i){let r=xu([n[0],n[1],n[2]]);const s=xu([n[4],n[5],n[6]]),a=xu([n[8],n[9],n[10]]);vE(n)<0&&(r=-r),t[0]=n[12],t[1]=n[13],t[2]=n[14];const l=n.slice(),u=1/r,c=1/s,d=1/a;l[0]*=u,l[1]*=u,l[2]*=u,l[4]*=c,l[5]*=c,l[6]*=c,l[8]*=d,l[9]*=d,l[10]*=d,yE(e,l),i[0]=r,i[1]=s,i[2]=a}function hN(n,e,t,i){const r=n,s=e[0],a=e[1],o=e[2],l=e[3],u=s+s,c=a+a,d=o+o,f=s*u,h=s*c,m=s*d,_=a*c,g=a*d,p=o*d,v=l*u,S=l*c,x=l*d,E=i[0],T=i[1],w=i[2];return r[0]=(1-(_+p))*E,r[1]=(h+x)*E,r[2]=(m-S)*E,r[3]=0,r[4]=(h-x)*T,r[5]=(1-(f+p))*T,r[6]=(g+v)*T,r[7]=0,r[8]=(m+S)*w,r[9]=(g-v)*w,r[10]=(1-(f+_))*w,r[11]=0,r[12]=t[0],r[13]=t[1],r[14]=t[2],r[15]=1,r}function pN(n,e){let t=e[0],i=e[1],r=e[2],s=e[3],a=t+t,o=i+i,l=r+r,u=t*a,c=i*a,d=i*o,f=r*a,h=r*o,m=r*l,_=s*a,g=s*o,p=s*l;return n[0]=1-d-m,n[1]=c+p,n[2]=f-g,n[3]=0,n[4]=c-p,n[5]=1-u-m,n[6]=h+_,n[7]=0,n[8]=f+g,n[9]=h-_,n[10]=1-u-d,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,n}function mN(n,e,t,i,r){let s=1/Math.tan(e/2),a=1/(i-r);return n[0]=s/t,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=s,n[6]=0,n[7]=0,n[8]=0,n[9]=0,n[10]=(r+i)*a,n[11]=-1,n[12]=0,n[13]=0,n[14]=2*r*i*a,n[15]=0,n}function gN(n,e,t,i,r,s,a){let o=1/(e-t),l=1/(i-r),u=1/(s-a);return n[0]=-2*o,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=-2*l,n[6]=0,n[7]=0,n[8]=0,n[9]=0,n[10]=2*u,n[11]=0,n[12]=(e+t)*o,n[13]=(r+i)*l,n[14]=(a+s)*u,n[15]=1,n}function _N(n,e,t,i){let r=e[0],s=e[1],a=e[2],o=i[0],l=i[1],u=i[2],c=r-t[0],d=s-t[1],f=a-t[2],h=c*c+d*d+f*f;h===0?f=1:(h=1/Math.sqrt(h),c*=h,d*=h,f*=h);let m=l*f-u*d,_=u*c-o*f,g=o*d-l*c;return h=m*m+_*_+g*g,h===0&&(u?o+=1e-6:l?u+=1e-6:l+=1e-6,m=l*f-u*d,_=u*c-o*f,g=o*d-l*c,h=m*m+_*_+g*g),h=1/Math.sqrt(h),m*=h,_*=h,g*=h,n[0]=m,n[1]=_,n[2]=g,n[3]=0,n[4]=d*g-f*_,n[5]=f*m-c*g,n[6]=c*_-d*m,n[7]=0,n[8]=c,n[9]=d,n[10]=f,n[11]=0,n[12]=r,n[13]=s,n[14]=a,n[15]=1,n}function ry(n,e,t){return n[0]=e[0]+t[0],n[1]=e[1]+t[1],n[2]=e[2]+t[2],n[3]=e[3]+t[3],n[4]=e[4]+t[4],n[5]=e[5]+t[5],n[6]=e[6]+t[6],n[7]=e[7]+t[7],n[8]=e[8]+t[8],n[9]=e[9]+t[9],n[10]=e[10]+t[10],n[11]=e[11]+t[11],n[12]=e[12]+t[12],n[13]=e[13]+t[13],n[14]=e[14]+t[14],n[15]=e[15]+t[15],n}function sy(n,e,t){return n[0]=e[0]-t[0],n[1]=e[1]-t[1],n[2]=e[2]-t[2],n[3]=e[3]-t[3],n[4]=e[4]-t[4],n[5]=e[5]-t[5],n[6]=e[6]-t[6],n[7]=e[7]-t[7],n[8]=e[8]-t[8],n[9]=e[9]-t[9],n[10]=e[10]-t[10],n[11]=e[11]-t[11],n[12]=e[12]-t[12],n[13]=e[13]-t[13],n[14]=e[14]-t[14],n[15]=e[15]-t[15],n}function vN(n,e,t){return n[0]=e[0]*t,n[1]=e[1]*t,n[2]=e[2]*t,n[3]=e[3]*t,n[4]=e[4]*t,n[5]=e[5]*t,n[6]=e[6]*t,n[7]=e[7]*t,n[8]=e[8]*t,n[9]=e[9]*t,n[10]=e[10]*t,n[11]=e[11]*t,n[12]=e[12]*t,n[13]=e[13]*t,n[14]=e[14]*t,n[15]=e[15]*t,n}class Ad extends Array{constructor(e=1,t=0,i=0,r=0,s=0,a=1,o=0,l=0,u=0,c=0,d=1,f=0,h=0,m=0,_=0,g=1){return super(e,t,i,r,s,a,o,l,u,c,d,f,h,m,_,g),this}get x(){return this[12]}get y(){return this[13]}get z(){return this[14]}get w(){return this[15]}set x(e){this[12]=e}set y(e){this[13]=e}set z(e){this[14]=e}set w(e){this[15]=e}set(e,t,i,r,s,a,o,l,u,c,d,f,h,m,_,g){return e.length?this.copy(e):(rN(this,e,t,i,r,s,a,o,l,u,c,d,f,h,m,_,g),this)}translate(e,t=this){return oN(this,t,e),this}rotate(e,t,i=this){return uN(this,i,e,t),this}scale(e,t=this){return lN(this,t,typeof e=="number"?[e,e,e]:e),this}add(e,t){return t?ry(this,e,t):ry(this,this,e),this}sub(e,t){return t?sy(this,e,t):sy(this,this,e),this}multiply(e,t){return e.length?t?iy(this,e,t):iy(this,this,e):vN(this,this,e),this}identity(){return sN(this),this}copy(e){return iN(this,e),this}fromPerspective({fov:e,aspect:t,near:i,far:r}={}){return mN(this,e,t,i,r),this}fromOrthogonal({left:e,right:t,bottom:i,top:r,near:s,far:a}){return gN(this,e,t,i,r,s,a),this}fromQuaternion(e){return pN(this,e),this}setPosition(e){return this.x=e[0],this.y=e[1],this.z=e[2],this}inverse(e=this){return aN(this,e),this}compose(e,t,i){return hN(this,e,t,i),this}decompose(e,t,i){return dN(this,e,t,i),this}getRotation(e){return yE(e,this),this}getTranslation(e){return cN(e,this),this}getScaling(e){return xE(e,this),this}getMaxScaleOnAxis(){return fN(this)}lookAt(e,t,i){return _N(this,e,t,i),this}determinant(){return vE(this)}fromArray(e,t=0){return this[0]=e[t],this[1]=e[t+1],this[2]=e[t+2],this[3]=e[t+3],this[4]=e[t+4],this[5]=e[t+5],this[6]=e[t+6],this[7]=e[t+7],this[8]=e[t+8],this[9]=e[t+9],this[10]=e[t+10],this[11]=e[t+11],this[12]=e[t+12],this[13]=e[t+13],this[14]=e[t+14],this[15]=e[t+15],this}toArray(e=[],t=0){return e[t]=this[0],e[t+1]=this[1],e[t+2]=this[2],e[t+3]=this[3],e[t+4]=this[4],e[t+5]=this[5],e[t+6]=this[6],e[t+7]=this[7],e[t+8]=this[8],e[t+9]=this[9],e[t+10]=this[10],e[t+11]=this[11],e[t+12]=this[12],e[t+13]=this[13],e[t+14]=this[14],e[t+15]=this[15],e}}function xN(n,e,t="YXZ"){return t==="XYZ"?(n[1]=Math.asin(Math.min(Math.max(e[8],-1),1)),Math.abs(e[8])<.99999?(n[0]=Math.atan2(-e[9],e[10]),n[2]=Math.atan2(-e[4],e[0])):(n[0]=Math.atan2(e[6],e[5]),n[2]=0)):t==="YXZ"?(n[0]=Math.asin(-Math.min(Math.max(e[9],-1),1)),Math.abs(e[9])<.99999?(n[1]=Math.atan2(e[8],e[10]),n[2]=Math.atan2(e[1],e[5])):(n[1]=Math.atan2(-e[2],e[0]),n[2]=0)):t==="ZXY"?(n[0]=Math.asin(Math.min(Math.max(e[6],-1),1)),Math.abs(e[6])<.99999?(n[1]=Math.atan2(-e[2],e[10]),n[2]=Math.atan2(-e[4],e[5])):(n[1]=0,n[2]=Math.atan2(e[1],e[0]))):t==="ZYX"?(n[1]=Math.asin(-Math.min(Math.max(e[2],-1),1)),Math.abs(e[2])<.99999?(n[0]=Math.atan2(e[6],e[10]),n[2]=Math.atan2(e[1],e[0])):(n[0]=0,n[2]=Math.atan2(-e[4],e[5]))):t==="YZX"?(n[2]=Math.asin(Math.min(Math.max(e[1],-1),1)),Math.abs(e[1])<.99999?(n[0]=Math.atan2(-e[9],e[5]),n[1]=Math.atan2(-e[2],e[0])):(n[0]=0,n[1]=Math.atan2(e[8],e[10]))):t==="XZY"&&(n[2]=Math.asin(-Math.min(Math.max(e[4],-1),1)),Math.abs(e[4])<.99999?(n[0]=Math.atan2(e[6],e[5]),n[1]=Math.atan2(e[8],e[0])):(n[0]=Math.atan2(-e[9],e[10]),n[1]=0)),n}const ay=new Ad;class yN extends Array{constructor(e=0,t=e,i=e,r="YXZ"){super(e,t,i),this.order=r,this.onChange=()=>{},this._target=this;const s=["0","1","2"];return new Proxy(this,{set(a,o){const l=Reflect.set(...arguments);return l&&s.includes(o)&&a.onChange(),l}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set(e,t=e,i=e){return e.length?this.copy(e):(this._target[0]=e,this._target[1]=t,this._target[2]=i,this.onChange(),this)}copy(e){return this._target[0]=e[0],this._target[1]=e[1],this._target[2]=e[2],this.onChange(),this}reorder(e){return this._target.order=e,this.onChange(),this}fromRotationMatrix(e,t=this.order){return xN(this._target,e,t),this.onChange(),this}fromQuaternion(e,t=this.order,i){return ay.fromQuaternion(e),this._target.fromRotationMatrix(ay,t),i||this.onChange(),this}fromArray(e,t=0){return this._target[0]=e[t],this._target[1]=e[t+1],this._target[2]=e[t+2],this}toArray(e=[],t=0){return e[t]=this[0],e[t+1]=this[1],e[t+2]=this[2],e}}class SN{constructor(){this.parent=null,this.children=[],this.visible=!0,this.matrix=new Ad,this.worldMatrix=new Ad,this.matrixAutoUpdate=!0,this.worldMatrixNeedsUpdate=!1,this.position=new _r,this.quaternion=new tN,this.scale=new _r(1),this.rotation=new yN,this.up=new _r(0,1,0),this.rotation._target.onChange=()=>this.quaternion.fromEuler(this.rotation,!0),this.quaternion._target.onChange=()=>this.rotation.fromQuaternion(this.quaternion,void 0,!0)}setParent(e,t=!0){this.parent&&e!==this.parent&&this.parent.removeChild(this,!1),this.parent=e,t&&e&&e.addChild(this,!1)}addChild(e,t=!0){~this.children.indexOf(e)||this.children.push(e),t&&e.setParent(this,!1)}removeChild(e,t=!0){~this.children.indexOf(e)&&this.children.splice(this.children.indexOf(e),1),t&&e.setParent(null,!1)}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.worldMatrixNeedsUpdate||e)&&(this.parent===null?this.worldMatrix.copy(this.matrix):this.worldMatrix.multiply(this.parent.worldMatrix,this.matrix),this.worldMatrixNeedsUpdate=!1,e=!0);for(let t=0,i=this.children.length;t<i;t++)this.children[t].updateMatrixWorld(e)}updateMatrix(){this.matrix.compose(this.quaternion,this.position,this.scale),this.worldMatrixNeedsUpdate=!0}traverse(e){if(!e(this))for(let t=0,i=this.children.length;t<i;t++)this.children[t].traverse(e)}decompose(){this.matrix.decompose(this.quaternion._target,this.position,this.scale),this.rotation.fromQuaternion(this.quaternion)}lookAt(e,t=!1){t?this.matrix.lookAt(this.position,e,this.up):this.matrix.lookAt(e,this.position,this.up),this.matrix.getRotation(this.quaternion._target),this.rotation.fromQuaternion(this.quaternion)}}function MN(n,e){return n[0]=e[0],n[1]=e[1],n[2]=e[2],n[3]=e[4],n[4]=e[5],n[5]=e[6],n[6]=e[8],n[7]=e[9],n[8]=e[10],n}function EN(n,e){let t=e[0],i=e[1],r=e[2],s=e[3],a=t+t,o=i+i,l=r+r,u=t*a,c=i*a,d=i*o,f=r*a,h=r*o,m=r*l,_=s*a,g=s*o,p=s*l;return n[0]=1-d-m,n[3]=c-p,n[6]=f+g,n[1]=c+p,n[4]=1-u-m,n[7]=h-_,n[2]=f-g,n[5]=h+_,n[8]=1-u-d,n}function TN(n,e){return n[0]=e[0],n[1]=e[1],n[2]=e[2],n[3]=e[3],n[4]=e[4],n[5]=e[5],n[6]=e[6],n[7]=e[7],n[8]=e[8],n}function wN(n,e,t,i,r,s,a,o,l,u){return n[0]=e,n[1]=t,n[2]=i,n[3]=r,n[4]=s,n[5]=a,n[6]=o,n[7]=l,n[8]=u,n}function AN(n){return n[0]=1,n[1]=0,n[2]=0,n[3]=0,n[4]=1,n[5]=0,n[6]=0,n[7]=0,n[8]=1,n}function CN(n,e){let t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],u=e[7],c=e[8],d=c*a-o*u,f=-c*s+o*l,h=u*s-a*l,m=t*d+i*f+r*h;return m?(m=1/m,n[0]=d*m,n[1]=(-c*i+r*u)*m,n[2]=(o*i-r*a)*m,n[3]=f*m,n[4]=(c*t-r*l)*m,n[5]=(-o*t+r*s)*m,n[6]=h*m,n[7]=(-u*t+i*l)*m,n[8]=(a*t-i*s)*m,n):null}function oy(n,e,t){let i=e[0],r=e[1],s=e[2],a=e[3],o=e[4],l=e[5],u=e[6],c=e[7],d=e[8],f=t[0],h=t[1],m=t[2],_=t[3],g=t[4],p=t[5],v=t[6],S=t[7],x=t[8];return n[0]=f*i+h*a+m*u,n[1]=f*r+h*o+m*c,n[2]=f*s+h*l+m*d,n[3]=_*i+g*a+p*u,n[4]=_*r+g*o+p*c,n[5]=_*s+g*l+p*d,n[6]=v*i+S*a+x*u,n[7]=v*r+S*o+x*c,n[8]=v*s+S*l+x*d,n}function RN(n,e,t){let i=e[0],r=e[1],s=e[2],a=e[3],o=e[4],l=e[5],u=e[6],c=e[7],d=e[8],f=t[0],h=t[1];return n[0]=i,n[1]=r,n[2]=s,n[3]=a,n[4]=o,n[5]=l,n[6]=f*i+h*a+u,n[7]=f*r+h*o+c,n[8]=f*s+h*l+d,n}function bN(n,e,t){let i=e[0],r=e[1],s=e[2],a=e[3],o=e[4],l=e[5],u=e[6],c=e[7],d=e[8],f=Math.sin(t),h=Math.cos(t);return n[0]=h*i+f*a,n[1]=h*r+f*o,n[2]=h*s+f*l,n[3]=h*a-f*i,n[4]=h*o-f*r,n[5]=h*l-f*s,n[6]=u,n[7]=c,n[8]=d,n}function PN(n,e,t){let i=t[0],r=t[1];return n[0]=i*e[0],n[1]=i*e[1],n[2]=i*e[2],n[3]=r*e[3],n[4]=r*e[4],n[5]=r*e[5],n[6]=e[6],n[7]=e[7],n[8]=e[8],n}function DN(n,e){let t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],u=e[7],c=e[8],d=e[9],f=e[10],h=e[11],m=e[12],_=e[13],g=e[14],p=e[15],v=t*o-i*a,S=t*l-r*a,x=t*u-s*a,E=i*l-r*o,T=i*u-s*o,w=r*u-s*l,y=c*_-d*m,A=c*g-f*m,R=c*p-h*m,D=d*g-f*_,L=d*p-h*_,z=f*p-h*g,I=v*z-S*L+x*D+E*R-T*A+w*y;return I?(I=1/I,n[0]=(o*z-l*L+u*D)*I,n[1]=(l*R-a*z-u*A)*I,n[2]=(a*L-o*R+u*y)*I,n[3]=(r*L-i*z-s*D)*I,n[4]=(t*z-r*R+s*A)*I,n[5]=(i*R-t*L-s*y)*I,n[6]=(_*w-g*T+p*E)*I,n[7]=(g*x-m*w-p*S)*I,n[8]=(m*T-_*x+p*v)*I,n):null}class LN extends Array{constructor(e=1,t=0,i=0,r=0,s=1,a=0,o=0,l=0,u=1){return super(e,t,i,r,s,a,o,l,u),this}set(e,t,i,r,s,a,o,l,u){return e.length?this.copy(e):(wN(this,e,t,i,r,s,a,o,l,u),this)}translate(e,t=this){return RN(this,t,e),this}rotate(e,t=this){return bN(this,t,e),this}scale(e,t=this){return PN(this,t,e),this}multiply(e,t){return t?oy(this,e,t):oy(this,this,e),this}identity(){return AN(this),this}copy(e){return TN(this,e),this}fromMatrix4(e){return MN(this,e),this}fromQuaternion(e){return EN(this,e),this}fromBasis(e,t,i){return this.set(e[0],e[1],e[2],t[0],t[1],t[2],i[0],i[1],i[2]),this}inverse(e=this){return CN(this,e),this}getNormalMatrix(e){return DN(this,e),this}}let NN=0;class IN extends SN{constructor(e,{geometry:t,program:i,mode:r=e.TRIANGLES,frustumCulled:s=!0,renderOrder:a=0}={}){super(),e.canvas||console.error("gl not passed as first argument to Mesh"),this.gl=e,this.id=NN++,this.geometry=t,this.program=i,this.mode=r,this.frustumCulled=s,this.renderOrder=a,this.modelViewMatrix=new Ad,this.normalMatrix=new LN,this.beforeRenderCallbacks=[],this.afterRenderCallbacks=[]}onBeforeRender(e){return this.beforeRenderCallbacks.push(e),this}onAfterRender(e){return this.afterRenderCallbacks.push(e),this}draw({camera:e}={}){e&&(this.program.uniforms.modelMatrix||Object.assign(this.program.uniforms,{modelMatrix:{value:null},viewMatrix:{value:null},modelViewMatrix:{value:null},normalMatrix:{value:null},projectionMatrix:{value:null},cameraPosition:{value:null}}),this.program.uniforms.projectionMatrix.value=e.projectionMatrix,this.program.uniforms.cameraPosition.value=e.worldPosition,this.program.uniforms.viewMatrix.value=e.viewMatrix,this.modelViewMatrix.multiply(e.viewMatrix,this.worldMatrix),this.normalMatrix.getNormalMatrix(this.modelViewMatrix),this.program.uniforms.modelMatrix.value=this.worldMatrix,this.program.uniforms.modelViewMatrix.value=this.modelViewMatrix,this.program.uniforms.normalMatrix.value=this.normalMatrix),this.beforeRenderCallbacks.forEach(i=>i&&i({mesh:this,camera:e}));let t=this.program.cullFace&&this.worldMatrix.determinant()<0;this.program.use({flipFaces:t}),this.geometry.draw({mode:this.mode,program:this.program}),this.afterRenderCallbacks.forEach(i=>i&&i({mesh:this,camera:e}))}}class UN extends bL{constructor(e,{attributes:t={}}={}){Object.assign(t,{position:{size:2,data:new Float32Array([-1,-1,3,-1,-1,3])},uv:{size:2,data:new Float32Array([0,0,2,0,0,2])}}),super(e,t)}}function Sp(n){let e=n.replace("#",""),t=0,i=0,r=0,s=1;return e.length===6?(t=parseInt(e.slice(0,2),16)/255,i=parseInt(e.slice(2,4),16)/255,r=parseInt(e.slice(4,6),16)/255):e.length===8&&(t=parseInt(e.slice(0,2),16)/255,i=parseInt(e.slice(2,4),16)/255,r=parseInt(e.slice(4,6),16)/255,s=parseInt(e.slice(6,8),16)/255),[t,i,r,s]}const FN=`
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`,ON=`
precision highp float;

#define PI 3.14159265359

uniform float iTime;
uniform vec3 iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2 uOffset;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform bool uIsRotate;
uniform vec2 uMouse;

varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screen_coords) {
    float pixel_size = length(screenSize.xy) / uPixelFilter;
    vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
    float uv_len = length(uv);
    
    float speed = (uSpinRotation * uSpinEase * 0.2);
    if(uIsRotate){
       speed = iTime * speed;
    }
    speed += 302.2;
    
    float mouseInfluence = (uMouse.x * 2.0 - 1.0);
    speed += mouseInfluence * 0.1;
    
    float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
    vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
    uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);
    
    uv *= 30.0;
    float baseSpeed = iTime * uSpinSpeed;
    speed = baseSpeed + mouseInfluence * 2.0;
    
    vec2 uv2 = vec2(uv.x + uv.y);
    
    for(int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
    }
    
    float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);
    float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);
    
    return (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;
}

void main() {
    vec2 uv = vUv * iResolution.xy;
    gl_FragColor = effect(iResolution.xy, uv);
}
`;function SE({spinRotation:n=-2,spinSpeed:e=7,offset:t=[0,0],color1:i="#DE443B",color2:r="#006BB4",color3:s="#162325",contrast:a=3.5,lighting:o=.4,spinAmount:l=.25,pixelFilter:u=745,spinEase:c=1,isRotate:d=!1,mouseInteraction:f=!0}){const h=Ye.useRef(null);return Ye.useEffect(()=>{if(!h.current)return;const m=h.current,_=new FL,g=_.gl;g.clearColor(0,0,0,1);let p;function v(){_.setSize(m.offsetWidth,m.offsetHeight),p&&(p.uniforms.iResolution.value=[g.canvas.width,g.canvas.height,g.canvas.width/g.canvas.height])}window.addEventListener("resize",v),v();const S=new UN(g);p=new DL(g,{vertex:FN,fragment:ON,uniforms:{iTime:{value:0},iResolution:{value:[g.canvas.width,g.canvas.height,g.canvas.width/g.canvas.height]},uSpinRotation:{value:n},uSpinSpeed:{value:e},uOffset:{value:t},uColor1:{value:Sp(i)},uColor2:{value:Sp(r)},uColor3:{value:Sp(s)},uContrast:{value:a},uLighting:{value:o},uSpinAmount:{value:l},uPixelFilter:{value:u},uSpinEase:{value:c},uIsRotate:{value:d},uMouse:{value:[.5,.5]}}});const x=new IN(g,{geometry:S,program:p});let E;function T(y){E=requestAnimationFrame(T),p.uniforms.iTime.value=y*.001,_.render({scene:x})}E=requestAnimationFrame(T),m.appendChild(g.canvas);function w(y){if(!f)return;const A=m.getBoundingClientRect(),R=(y.clientX-A.left)/A.width,D=1-(y.clientY-A.top)/A.height;p.uniforms.uMouse.value=[R,D]}return m.addEventListener("mousemove",w),()=>{var y;cancelAnimationFrame(E),window.removeEventListener("resize",v),m.removeEventListener("mousemove",w),m.removeChild(g.canvas),(y=g.getExtension("WEBGL_lose_context"))==null||y.loseContext()}},[n,e,t,i,r,s,a,o,l,u,c,d,f,h]),j.jsx("div",{ref:h,className:"balatro-container"})}function kN(){const[n,e]=Ye.useState(!1),t=Ye.useRef(null);return Ye.useEffect(()=>{const i=t.current;i&&i.complete&&i.naturalWidth>0&&e(!0)},[]),j.jsx("section",{className:"section",id:"about",children:j.jsxs("div",{className:"wrap",children:[j.jsx("div",{className:"sec-head",children:j.jsxs("div",{children:[j.jsx("span",{className:"eyebrow",children:"01 / ABOUT"}),j.jsx("div",{className:"title-mask",children:j.jsx("h2",{className:"sec-title",children:j.jsx("span",{className:"title-mask-inner",children:"关于我"})})})]})}),j.jsxs("div",{className:"about-grid",children:[j.jsxs("div",{children:[j.jsxs("div",{className:"avatar-frame",children:[j.jsx("div",{className:"avatar-cubes",children:j.jsx(fL,{gridSize:8,maxAngle:175,radius:2,borderStyle:"2px dashed #B497CF",faceColor:"#1a1a2e",rippleColor:"#ff6b6b",rippleSpeed:1.5,autoAnimate:!0,rippleOnClick:!0})}),j.jsx("div",{className:`avatar-curtain${n?" open":""}`,"aria-hidden":"true",children:j.jsx(SE,{isRotate:!1,mouseInteraction:!0,pixelFilter:745,color1:"#6366F1",color2:"#EC4899",color3:"#162325"})}),j.jsx("img",{ref:t,className:`avatar-img${n?" loaded":""}`,src:cn.avatar,alt:"头像",loading:"lazy",onLoad:()=>e(!0)}),j.jsxs("span",{className:"avatar-status",children:[j.jsx("i",{}),"AVAILABLE"]})]}),j.jsx("div",{className:"about-facts",children:cn.facts.map(i=>j.jsxs("div",{className:"fact",children:[j.jsx("span",{className:"k",children:i.k}),j.jsx("span",{className:"v",children:i.v})]},i.k))})]}),j.jsxs("div",{children:[cn.bio.map((i,r)=>j.jsx("p",{dangerouslySetInnerHTML:{__html:i.replace("{name}",cn.name)}},r)),j.jsx("div",{className:"contact-list",children:cn.contacts.map(i=>i.href?j.jsxs("a",{className:"contact-item",href:i.href,target:"_blank",rel:"noreferrer",children:[j.jsx("span",{className:"label",children:i.label}),j.jsx("span",{className:"value",children:i.value})]},i.label):j.jsxs("div",{className:"contact-item",children:[j.jsx("span",{className:"label",children:i.label}),j.jsx("span",{className:"value",children:i.value})]},i.label))})]})]}),j.jsx("div",{className:"stats",children:cn.stats.map(i=>j.jsxs("div",{className:"stat",children:[j.jsxs("div",{className:"num",children:[i.num,j.jsx("em",{children:i.suffix})]}),j.jsx("div",{className:"label",children:i.label})]},i.label))})]})})}function BN(){return j.jsxs("section",{className:"section section-alt",id:"projects",children:[j.jsx("div",{className:"projects-bg","aria-hidden":"true",children:j.jsx(SE,{isRotate:!1,mouseInteraction:!0,pixelFilter:745,color1:"#6366F1",color2:"#EC4899",color3:"#162325"})}),j.jsxs("div",{className:"wrap",children:[j.jsx("div",{className:"sec-head",children:j.jsxs("div",{children:[j.jsx("span",{className:"eyebrow",children:"02 / SELECTED PROJECTS"}),j.jsx("div",{className:"title-mask",children:j.jsx("h2",{className:"sec-title",children:j.jsx("span",{className:"title-mask-inner",children:"精选项目"})})})]})}),j.jsx("div",{className:"projects-list",children:cn.projects.map((n,e)=>j.jsxs("article",{className:"project-card",children:[j.jsx("div",{className:"project-visual",children:j.jsx("img",{src:n.image,alt:n.title,loading:"lazy"})}),j.jsxs("div",{className:"project-meta",children:[j.jsxs("div",{className:"tags",children:[j.jsx("span",{className:"tag accent",children:n.year}),n.tags.map(t=>j.jsx("span",{className:"tag",children:t},t))]}),j.jsx("h3",{children:n.title}),j.jsx("p",{children:n.desc}),n.link?j.jsxs("a",{className:"project-link",href:n.link,target:"_blank",rel:"noreferrer",children:["了解更多 ",j.jsx("span",{className:"arrow",children:"→"})]}):j.jsxs("span",{className:"project-link",children:["即将上线 ",j.jsx("span",{className:"arrow",children:"→"})]})]})]},n.title))})]})]})}function zN(){const[n,e]=Ye.useState(()=>new Date);Ye.useEffect(()=>{const i=setInterval(()=>e(new Date),1e3);return()=>clearInterval(i)},[]);const t=i=>String(i).padStart(2,"0");return`${t(n.getHours())}:${t(n.getMinutes())}:${t(n.getSeconds())}`}function VN(){const n=zN();return j.jsxs("footer",{className:"contact",id:"contact",children:[j.jsxs("div",{className:"contact-inner wrap",children:[j.jsx("span",{className:"eyebrow",children:"03 / CONTACT"}),j.jsxs("h2",{className:"contact-title",children:[j.jsx("span",{className:"title-mask",children:j.jsx("span",{className:"title-mask-inner",children:cn.contactTitleA})}),j.jsx("br",{}),j.jsx("span",{className:"title-mask",children:j.jsx("span",{className:"title-mask-inner hl",children:cn.contactTitleB})})]}),j.jsx("p",{className:"contact-sub",children:cn.contactSub}),j.jsx("a",{className:"contact-mail",href:`mailto:${cn.contactMail}`,children:cn.contactMail}),j.jsx("div",{className:"contact-socials",children:cn.socials.map(e=>j.jsx("a",{className:"social-chip",href:e.href,target:"_blank",rel:"noreferrer",children:e.label},e.label))})]}),j.jsx("div",{className:"contact-foot",children:j.jsxs("div",{className:"wrap",children:[j.jsx("span",{children:cn.footer.copyright}),j.jsxs("span",{className:"time",children:["LOCAL TIME ",j.jsx("em",{children:n})]}),j.jsx("span",{children:cn.footer.powered}),j.jsx("a",{className:"to-top",href:"#top",children:"回到顶部 ↑"})]})})]})}function HN(n,e){for(var t=0;t<e.length;t++){var i=e[t];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(n,i.key,i)}}function GN(n,e,t){return e&&HN(n.prototype,e),n}/*!
 * Observer 3.15.0
 * https://gsap.com
 *
 * @license Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var Dn,Of,Ni,Ws,Xs,il,ME,Ta,rl,EE,as,fr,TE,wE=function(){return Dn||typeof window<"u"&&(Dn=window.gsap)&&Dn.registerPlugin&&Dn},AE=1,Wo=[],at=[],Hr=[],yu=Date.now,Cg=function(e,t){return t},WN=function(){var e=rl.core,t=e.bridge||{},i=e._scrollers,r=e._proxies;i.push.apply(i,at),r.push.apply(r,Hr),at=i,Hr=r,Cg=function(a,o){return t[a](o)}},na=function(e,t){return~Hr.indexOf(e)&&Hr[Hr.indexOf(e)+1][t]},Su=function(e){return!!~EE.indexOf(e)},Qn=function(e,t,i,r,s){return e.addEventListener(t,i,{passive:r!==!1,capture:!!s})},jn=function(e,t,i,r){return e.removeEventListener(t,i,!!r)},rf="scrollLeft",sf="scrollTop",Rg=function(){return as&&as.isPressed||at.cache++},Cd=function(e,t){var i=function r(s){if(s||s===0){AE&&(Ni.history.scrollRestoration="manual");var a=as&&as.isPressed;s=r.v=Math.round(s)||(as&&as.iOS?1:0),e(s),r.cacheID=at.cache,a&&Cg("ss",s)}else(t||at.cache!==r.cacheID||Cg("ref"))&&(r.cacheID=at.cache,r.v=e());return r.v+r.offset};return i.offset=0,e&&i},ri={s:rf,p:"left",p2:"Left",os:"right",os2:"Right",d:"width",d2:"Width",a:"x",sc:Cd(function(n){return arguments.length?Ni.scrollTo(n,_n.sc()):Ni.pageXOffset||Ws[rf]||Xs[rf]||il[rf]||0})},_n={s:sf,p:"top",p2:"Top",os:"bottom",os2:"Bottom",d:"height",d2:"Height",a:"y",op:ri,sc:Cd(function(n){return arguments.length?Ni.scrollTo(ri.sc(),n):Ni.pageYOffset||Ws[sf]||Xs[sf]||il[sf]||0})},ci=function(e,t){return(t&&t._ctx&&t._ctx.selector||Dn.utils.toArray)(e)[0]||(typeof e=="string"&&Dn.config().nullTargetWarn!==!1?console.warn("Element not found:",e):null)},XN=function(e,t){for(var i=t.length;i--;)if(t[i]===e||t[i].contains(e))return!0;return!1},ua=function(e,t){var i=t.s,r=t.sc;Su(e)&&(e=Ws.scrollingElement||Xs);var s=at.indexOf(e),a=r===_n.sc?1:2;!~s&&(s=at.push(e)-1),at[s+a]||Qn(e,"scroll",Rg);var o=at[s+a],l=o||(at[s+a]=Cd(na(e,i),!0)||(Su(e)?r:Cd(function(u){return arguments.length?e[i]=u:e[i]})));return l.target=e,o||(l.smooth=Dn.getProperty(e,"scrollBehavior")==="smooth"),l},bg=function(e,t,i){var r=e,s=e,a=yu(),o=a,l=t||50,u=Math.max(500,l*3),c=function(m,_){var g=yu();_||g-a>l?(s=r,r=m,o=a,a=g):i?r+=m:r=s+(m-s)/(g-o)*(a-o)},d=function(){s=r=i?0:r,o=a=0},f=function(m){var _=o,g=s,p=yu();return(m||m===0)&&m!==r&&c(m),a===o||p-o>u?0:(r+(i?g:-g))/((i?p:a)-_)*1e3};return{update:c,reset:d,getVelocity:f}},Yl=function(e,t){return t&&!e._gsapAllow&&e.cancelable!==!1&&e.preventDefault(),e.changedTouches?e.changedTouches[0]:e},ly=function(e){var t=Math.max.apply(Math,e),i=Math.min.apply(Math,e);return Math.abs(t)>=Math.abs(i)?t:i},CE=function(){rl=Dn.core.globals().ScrollTrigger,rl&&rl.core&&WN()},RE=function(e){return Dn=e||wE(),!Of&&Dn&&typeof document<"u"&&document.body&&(Ni=window,Ws=document,Xs=Ws.documentElement,il=Ws.body,EE=[Ni,Ws,Xs,il],Dn.utils.clamp,TE=Dn.core.context||function(){},Ta="onpointerenter"in il?"pointer":"mouse",ME=rn.isTouch=Ni.matchMedia&&Ni.matchMedia("(hover: none), (pointer: coarse)").matches?1:"ontouchstart"in Ni||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0?2:0,fr=rn.eventTypes=("ontouchstart"in Xs?"touchstart,touchmove,touchcancel,touchend":"onpointerdown"in Xs?"pointerdown,pointermove,pointercancel,pointerup":"mousedown,mousemove,mouseup,mouseup").split(","),setTimeout(function(){return AE=0},500),Of=1),rl||CE(),Of};ri.op=_n;at.cache=0;var rn=function(){function n(t){this.init(t)}var e=n.prototype;return e.init=function(i){Of||RE(Dn)||console.warn("Please gsap.registerPlugin(Observer)"),rl||CE();var r=i.tolerance,s=i.dragMinimum,a=i.type,o=i.target,l=i.lineHeight,u=i.debounce,c=i.preventDefault,d=i.onStop,f=i.onStopDelay,h=i.ignore,m=i.wheelSpeed,_=i.event,g=i.onDragStart,p=i.onDragEnd,v=i.onDrag,S=i.onPress,x=i.onRelease,E=i.onRight,T=i.onLeft,w=i.onUp,y=i.onDown,A=i.onChangeX,R=i.onChangeY,D=i.onChange,L=i.onToggleX,z=i.onToggleY,I=i.onHover,F=i.onHoverEnd,G=i.onMove,U=i.ignoreCheck,N=i.isNormalizer,O=i.onGestureStart,b=i.onGestureEnd,Q=i.onWheel,te=i.onEnable,Oe=i.onDisable,be=i.onClick,Ce=i.scrollSpeed,$=i.capture,se=i.allowClicks,re=i.lockAxis,Ae=i.onLockAxis;this.target=o=ci(o)||Xs,this.vars=i,h&&(h=Dn.utils.toArray(h)),r=r||1e-9,s=s||0,m=m||1,Ce=Ce||1,a=a||"wheel,touch,pointer",u=u!==!1,l||(l=parseFloat(Ni.getComputedStyle(il).lineHeight)||22);var De,ye,je,me,Re,Ne,ke,W=this,et=0,ut=0,Pt=i.passive||!c&&i.passive!==!1,Ke=ua(o,ri),xt=ua(o,_n),B=Ke(),Yt=xt(),qe=~a.indexOf("touch")&&!~a.indexOf("pointer")&&fr[0]==="pointerdown",P=Su(o),M=o.ownerDocument||Ws,H=[0,0,0],Y=[0,0,0],J=0,he=function(){return J=yu()},ce=function(oe,We){return(W.event=oe)&&h&&XN(oe.target,h)||We&&qe&&oe.pointerType!=="touch"||U&&U(oe,We)},ee=function(){W._vx.reset(),W._vy.reset(),ye.pause(),d&&d(W)},ne=function(){var oe=W.deltaX=ly(H),We=W.deltaY=ly(Y),ue=Math.abs(oe)>=r,Xe=Math.abs(We)>=r;D&&(ue||Xe)&&D(W,oe,We,H,Y),ue&&(E&&W.deltaX>0&&E(W),T&&W.deltaX<0&&T(W),A&&A(W),L&&W.deltaX<0!=et<0&&L(W),et=W.deltaX,H[0]=H[1]=H[2]=0),Xe&&(y&&W.deltaY>0&&y(W),w&&W.deltaY<0&&w(W),R&&R(W),z&&W.deltaY<0!=ut<0&&z(W),ut=W.deltaY,Y[0]=Y[1]=Y[2]=0),(me||je)&&(G&&G(W),je&&(g&&je===1&&g(W),v&&v(W),je=0),me=!1),Ne&&!(Ne=!1)&&Ae&&Ae(W),Re&&(Q(W),Re=!1),De=0},_e=function(oe,We,ue){H[ue]+=oe,Y[ue]+=We,W._vx.update(oe),W._vy.update(We),u?De||(De=requestAnimationFrame(ne)):ne()},Ue=function(oe,We){re&&!ke&&(W.axis=ke=Math.abs(oe)>Math.abs(We)?"x":"y",Ne=!0),ke!=="y"&&(H[2]+=oe,W._vx.update(oe,!0)),ke!=="x"&&(Y[2]+=We,W._vy.update(We,!0)),u?De||(De=requestAnimationFrame(ne)):ne()},ve=function(oe){if(!ce(oe,1)){oe=Yl(oe,c);var We=oe.clientX,ue=oe.clientY,Xe=We-W.x,Fe=ue-W.y,Ze=W.isDragging;W.x=We,W.y=ue,(Ze||(Xe||Fe)&&(Math.abs(W.startX-We)>=s||Math.abs(W.startY-ue)>=s))&&(je||(je=Ze?2:1),Ze||(W.isDragging=!0),Ue(Xe,Fe))}},ge=W.onPress=function(le){ce(le,1)||le&&le.button||(W.axis=ke=null,ye.pause(),W.isPressed=!0,le=Yl(le),et=ut=0,W.startX=W.x=le.clientX,W.startY=W.y=le.clientY,W._vx.reset(),W._vy.reset(),Qn(N?o:M,fr[1],ve,Pt,!0),W.deltaX=W.deltaY=0,S&&S(W))},de=W.onRelease=function(le){if(!ce(le,1)){jn(N?o:M,fr[1],ve,!0);var oe=!isNaN(W.y-W.startY),We=W.isDragging,ue=We&&(Math.abs(W.x-W.startX)>3||Math.abs(W.y-W.startY)>3),Xe=Yl(le);!ue&&oe&&(W._vx.reset(),W._vy.reset(),c&&se&&Dn.delayedCall(.08,function(){if(yu()-J>300&&!le.defaultPrevented){if(le.target.click)le.target.click();else if(M.createEvent){var Fe=M.createEvent("MouseEvents");Fe.initMouseEvent("click",!0,!0,Ni,1,Xe.screenX,Xe.screenY,Xe.clientX,Xe.clientY,!1,!1,!1,!1,0,null),le.target.dispatchEvent(Fe)}}})),W.isDragging=W.isGesturing=W.isPressed=!1,d&&We&&!N&&ye.restart(!0),je&&ne(),p&&We&&p(W),x&&x(W,ue)}},ze=function(oe){return oe.touches&&oe.touches.length>1&&(W.isGesturing=!0)&&O(oe,W.isDragging)},Ge=function(){return(W.isGesturing=!1)||b(W)},k=function(oe){if(!ce(oe)){var We=Ke(),ue=xt();_e((We-B)*Ce,(ue-Yt)*Ce,1),B=We,Yt=ue,d&&ye.restart(!0)}},pe=function(oe){if(!ce(oe)){oe=Yl(oe,c),Q&&(Re=!0);var We=(oe.deltaMode===1?l:oe.deltaMode===2?Ni.innerHeight:1)*m;_e(oe.deltaX*We,oe.deltaY*We,0),d&&!N&&ye.restart(!0)}},ie=function(oe){if(!ce(oe)){var We=oe.clientX,ue=oe.clientY,Xe=We-W.x,Fe=ue-W.y;W.x=We,W.y=ue,me=!0,d&&ye.restart(!0),(Xe||Fe)&&Ue(Xe,Fe)}},xe=function(oe){W.event=oe,I(W)},Se=function(oe){W.event=oe,F(W)},ae=function(oe){return ce(oe)||Yl(oe,c)&&be(W)};ye=W._dc=Dn.delayedCall(f||.25,ee).pause(),W.deltaX=W.deltaY=0,W._vx=bg(0,50,!0),W._vy=bg(0,50,!0),W.scrollX=Ke,W.scrollY=xt,W.isDragging=W.isGesturing=W.isPressed=!1,TE(this),W.enable=function(le){return W.isEnabled||(Qn(P?M:o,"scroll",Rg),a.indexOf("scroll")>=0&&Qn(P?M:o,"scroll",k,Pt,$),a.indexOf("wheel")>=0&&Qn(o,"wheel",pe,Pt,$),(a.indexOf("touch")>=0&&ME||a.indexOf("pointer")>=0)&&(Qn(o,fr[0],ge,Pt,$),Qn(M,fr[2],de),Qn(M,fr[3],de),se&&Qn(o,"click",he,!0,!0),be&&Qn(o,"click",ae),O&&Qn(M,"gesturestart",ze),b&&Qn(M,"gestureend",Ge),I&&Qn(o,Ta+"enter",xe),F&&Qn(o,Ta+"leave",Se),G&&Qn(o,Ta+"move",ie)),W.isEnabled=!0,W.isDragging=W.isGesturing=W.isPressed=me=je=!1,W._vx.reset(),W._vy.reset(),B=Ke(),Yt=xt(),le&&le.type&&ge(le),te&&te(W)),W},W.disable=function(){W.isEnabled&&(Wo.filter(function(le){return le!==W&&Su(le.target)}).length||jn(P?M:o,"scroll",Rg),W.isPressed&&(W._vx.reset(),W._vy.reset(),jn(N?o:M,fr[1],ve,!0)),jn(P?M:o,"scroll",k,$),jn(o,"wheel",pe,$),jn(o,fr[0],ge,$),jn(M,fr[2],de),jn(M,fr[3],de),jn(o,"click",he,!0),jn(o,"click",ae),jn(M,"gesturestart",ze),jn(M,"gestureend",Ge),jn(o,Ta+"enter",xe),jn(o,Ta+"leave",Se),jn(o,Ta+"move",ie),W.isEnabled=W.isPressed=W.isDragging=!1,Oe&&Oe(W))},W.kill=W.revert=function(){W.disable();var le=Wo.indexOf(W);le>=0&&Wo.splice(le,1),as===W&&(as=0)},Wo.push(W),N&&Su(o)&&(as=W),W.enable(_)},GN(n,[{key:"velocityX",get:function(){return this._vx.getVelocity()}},{key:"velocityY",get:function(){return this._vy.getVelocity()}}]),n}();rn.version="3.15.0";rn.create=function(n){return new rn(n)};rn.register=RE;rn.getAll=function(){return Wo.slice()};rn.getById=function(n){return Wo.filter(function(e){return e.vars.id===n})[0]};wE()&&Dn.registerPlugin(rn);/*!
 * ScrollTrigger 3.15.0
 * https://gsap.com
 *
 * @license Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var Ie,Ro,st,St,Di,yt,o_,Rd,ic,Mu,nu,af,Vn,th,Pg,ni,uy,cy,bo,bE,Mp,PE,ei,Dg,DE,LE,Ls,Lg,l_,sl,u_,Eu,Ng,Ep,of=1,Hn=Date.now,Tp=Hn(),rr=0,iu=0,fy=function(e,t,i){var r=Ri(e)&&(e.substr(0,6)==="clamp("||e.indexOf("max")>-1);return i["_"+t+"Clamp"]=r,r?e.substr(6,e.length-7):e},dy=function(e,t){return t&&(!Ri(e)||e.substr(0,6)!=="clamp(")?"clamp("+e+")":e},YN=function n(){return iu&&requestAnimationFrame(n)},hy=function(){return th=1},py=function(){return th=0},br=function(e){return e},ru=function(e){return Math.round(e*1e5)/1e5||0},NE=function(){return typeof window<"u"},IE=function(){return Ie||NE()&&(Ie=window.gsap)&&Ie.registerPlugin&&Ie},ja=function(e){return!!~o_.indexOf(e)},UE=function(e){return(e==="Height"?u_:st["inner"+e])||Di["client"+e]||yt["client"+e]},FE=function(e){return na(e,"getBoundingClientRect")||(ja(e)?function(){return Hf.width=st.innerWidth,Hf.height=u_,Hf}:function(){return ns(e)})},qN=function(e,t,i){var r=i.d,s=i.d2,a=i.a;return(a=na(e,"getBoundingClientRect"))?function(){return a()[r]}:function(){return(t?UE(s):e["client"+s])||0}},$N=function(e,t){return!t||~Hr.indexOf(e)?FE(e):function(){return Hf}},Fr=function(e,t){var i=t.s,r=t.d2,s=t.d,a=t.a;return Math.max(0,(i="scroll"+r)&&(a=na(e,i))?a()-FE(e)()[s]:ja(e)?(Di[i]||yt[i])-UE(r):e[i]-e["offset"+r])},lf=function(e,t){for(var i=0;i<bo.length;i+=3)(!t||~t.indexOf(bo[i+1]))&&e(bo[i],bo[i+1],bo[i+2])},Ri=function(e){return typeof e=="string"},Xn=function(e){return typeof e=="function"},su=function(e){return typeof e=="number"},wa=function(e){return typeof e=="object"},ql=function(e,t,i){return e&&e.progress(t?0:1)&&i&&e.pause()},To=function(e,t,i){if(e.enabled){var r=e._ctx?e._ctx.add(function(){return t(e,i)}):t(e,i);r&&r.totalTime&&(e.callbackAnimation=r)}},wo=Math.abs,OE="left",kE="top",c_="right",f_="bottom",Va="width",Ha="height",Tu="Right",wu="Left",Au="Top",Cu="Bottom",un="padding",ji="margin",El="Width",d_="Height",mn="px",Qi=function(e){return st.getComputedStyle(e.nodeType===Node.DOCUMENT_NODE?e.scrollingElement:e)},KN=function(e){var t=Qi(e).position;e.style.position=t==="absolute"||t==="fixed"?t:"relative"},my=function(e,t){for(var i in t)i in e||(e[i]=t[i]);return e},ns=function(e,t){var i=t&&Qi(e)[Pg]!=="matrix(1, 0, 0, 1, 0, 0)"&&Ie.to(e,{x:0,y:0,xPercent:0,yPercent:0,rotation:0,rotationX:0,rotationY:0,scale:1,skewX:0,skewY:0}).progress(1),r=e.getBoundingClientRect?e.getBoundingClientRect():e.scrollingElement.getBoundingClientRect();return i&&i.progress(0).kill(),r},bd=function(e,t){var i=t.d2;return e["offset"+i]||e["client"+i]||0},BE=function(e){var t=[],i=e.labels,r=e.duration(),s;for(s in i)t.push(i[s]/r);return t},ZN=function(e){return function(t){return Ie.utils.snap(BE(e),t)}},h_=function(e){var t=Ie.utils.snap(e),i=Array.isArray(e)&&e.slice(0).sort(function(r,s){return r-s});return i?function(r,s,a){a===void 0&&(a=.001);var o;if(!s)return t(r);if(s>0){for(r-=a,o=0;o<i.length;o++)if(i[o]>=r)return i[o];return i[o-1]}else for(o=i.length,r+=a;o--;)if(i[o]<=r)return i[o];return i[0]}:function(r,s,a){a===void 0&&(a=.001);var o=t(r);return!s||Math.abs(o-r)<a||o-r<0==s<0?o:t(s<0?r-e:r+e)}},jN=function(e){return function(t,i){return h_(BE(e))(t,i.direction)}},uf=function(e,t,i,r){return i.split(",").forEach(function(s){return e(t,s,r)})},wn=function(e,t,i,r,s){return e.addEventListener(t,i,{passive:!r,capture:!!s})},Tn=function(e,t,i,r){return e.removeEventListener(t,i,!!r)},cf=function(e,t,i){i=i&&i.wheelHandler,i&&(e(t,"wheel",i),e(t,"touchmove",i))},gy={startColor:"green",endColor:"red",indent:0,fontSize:"16px",fontWeight:"normal"},ff={toggleActions:"play",anticipatePin:0},Pd={top:0,left:0,center:.5,bottom:1,right:1},kf=function(e,t){if(Ri(e)){var i=e.indexOf("="),r=~i?+(e.charAt(i-1)+1)*parseFloat(e.substr(i+1)):0;~i&&(e.indexOf("%")>i&&(r*=t/100),e=e.substr(0,i-1)),e=r+(e in Pd?Pd[e]*t:~e.indexOf("%")?parseFloat(e)*t/100:parseFloat(e)||0)}return e},df=function(e,t,i,r,s,a,o,l){var u=s.startColor,c=s.endColor,d=s.fontSize,f=s.indent,h=s.fontWeight,m=St.createElement("div"),_=ja(i)||na(i,"pinType")==="fixed",g=e.indexOf("scroller")!==-1,p=_?yt:i.tagName==="IFRAME"?i.contentDocument.body:i,v=e.indexOf("start")!==-1,S=v?u:c,x="border-color:"+S+";font-size:"+d+";color:"+S+";font-weight:"+h+";pointer-events:none;white-space:nowrap;font-family:sans-serif,Arial;z-index:1000;padding:4px 8px;border-width:0;border-style:solid;";return x+="position:"+((g||l)&&_?"fixed;":"absolute;"),(g||l||!_)&&(x+=(r===_n?c_:f_)+":"+(a+parseFloat(f))+"px;"),o&&(x+="box-sizing:border-box;text-align:left;width:"+o.offsetWidth+"px;"),m._isStart=v,m.setAttribute("class","gsap-marker-"+e+(t?" marker-"+t:"")),m.style.cssText=x,m.innerText=t||t===0?e+"-"+t:e,p.children[0]?p.insertBefore(m,p.children[0]):p.appendChild(m),m._offset=m["offset"+r.op.d2],Bf(m,0,r,v),m},Bf=function(e,t,i,r){var s={display:"block"},a=i[r?"os2":"p2"],o=i[r?"p2":"os2"];e._isFlipped=r,s[i.a+"Percent"]=r?-100:0,s[i.a]=r?"1px":0,s["border"+a+El]=1,s["border"+o+El]=0,s[i.p]=t+"px",Ie.set(e,s)},it=[],Ig={},rc,_y=function(){return Hn()-rr>34&&(rc||(rc=requestAnimationFrame(fs)))},Ao=function(){(!ei||!ei.isPressed||ei.startX>yt.clientWidth)&&(at.cache++,ei?rc||(rc=requestAnimationFrame(fs)):fs(),rr||Ja("scrollStart"),rr=Hn())},wp=function(){LE=st.innerWidth,DE=st.innerHeight},au=function(e){at.cache++,(e===!0||!Vn&&!PE&&!St.fullscreenElement&&!St.webkitFullscreenElement&&(!Dg||LE!==st.innerWidth||Math.abs(st.innerHeight-DE)>st.innerHeight*.25))&&Rd.restart(!0)},Qa={},QN=[],zE=function n(){return Tn(ot,"scrollEnd",n)||Ia(!0)},Ja=function(e){return Qa[e]&&Qa[e].map(function(t){return t()})||QN},Ai=[],VE=function(e){for(var t=0;t<Ai.length;t+=5)(!e||Ai[t+4]&&Ai[t+4].query===e)&&(Ai[t].style.cssText=Ai[t+1],Ai[t].getBBox&&Ai[t].setAttribute("transform",Ai[t+2]||""),Ai[t+3].uncache=1)},HE=function(){return at.forEach(function(e){return Xn(e)&&++e.cacheID&&(e.rec=e())})},p_=function(e,t){var i;for(ni=0;ni<it.length;ni++)i=it[ni],i&&(!t||i._ctx===t)&&(e?i.kill(1):i.revert(!0,!0));Eu=!0,t&&VE(t),t||Ja("revert")},GE=function(e,t){at.cache++,(t||!ii)&&at.forEach(function(i){return Xn(i)&&i.cacheID++&&(i.rec=0)}),Ri(e)&&(st.history.scrollRestoration=l_=e)},ii,Ga=0,vy,JN=function(){if(vy!==Ga){var e=vy=Ga;requestAnimationFrame(function(){return e===Ga&&Ia(!0)})}},WE=function(){yt.appendChild(sl),u_=!ei&&sl.offsetHeight||st.innerHeight,yt.removeChild(sl)},xy=function(e){return ic(".gsap-marker-start, .gsap-marker-end, .gsap-marker-scroller-start, .gsap-marker-scroller-end").forEach(function(t){return t.style.display=e?"none":"block"})},Ia=function(e,t){if(Di=St.documentElement,yt=St.body,o_=[st,St,Di,yt],rr&&!e&&!Eu){wn(ot,"scrollEnd",zE);return}WE(),ii=ot.isRefreshing=!0,Eu||HE();var i=Ja("refreshInit");bE&&ot.sort(),t||p_(),at.forEach(function(r){Xn(r)&&(r.smooth&&(r.target.style.scrollBehavior="auto"),r(0))}),it.slice(0).forEach(function(r){return r.refresh()}),Eu=!1,it.forEach(function(r){if(r._subPinOffset&&r.pin){var s=r.vars.horizontal?"offsetWidth":"offsetHeight",a=r.pin[s];r.revert(!0,1),r.adjustPinSpacing(r.pin[s]-a),r.refresh()}}),Ng=1,xy(!0),it.forEach(function(r){var s=Fr(r.scroller,r._dir),a=r.vars.end==="max"||r._endClamp&&r.end>s,o=r._startClamp&&r.start>=s;(a||o)&&r.setPositions(o?s-1:r.start,a?Math.max(o?s:r.start+1,s):r.end,!0)}),xy(!1),Ng=0,i.forEach(function(r){return r&&r.render&&r.render(-1)}),at.forEach(function(r){Xn(r)&&(r.smooth&&requestAnimationFrame(function(){return r.target.style.scrollBehavior="smooth"}),r.rec&&r(r.rec))}),GE(l_,1),Rd.pause(),Ga++,ii=2,fs(2),it.forEach(function(r){return Xn(r.vars.onRefresh)&&r.vars.onRefresh(r)}),ii=ot.isRefreshing=!1,Ja("refresh")},Ug=0,zf=1,Ru,fs=function(e){if(e===2||!ii&&!Eu){ot.isUpdating=!0,Ru&&Ru.update(0);var t=it.length,i=Hn(),r=i-Tp>=50,s=t&&it[0].scroll();if(zf=Ug>s?-1:1,ii||(Ug=s),r&&(rr&&!th&&i-rr>200&&(rr=0,Ja("scrollEnd")),nu=Tp,Tp=i),zf<0){for(ni=t;ni-- >0;)it[ni]&&it[ni].update(0,r);zf=1}else for(ni=0;ni<t;ni++)it[ni]&&it[ni].update(0,r);ot.isUpdating=!1}rc=0},Fg=[OE,kE,f_,c_,ji+Cu,ji+Tu,ji+Au,ji+wu,"display","flexShrink","float","zIndex","gridColumnStart","gridColumnEnd","gridRowStart","gridRowEnd","gridArea","justifySelf","alignSelf","placeSelf","order"],Vf=Fg.concat([Va,Ha,"boxSizing","max"+El,"max"+d_,"position",ji,un,un+Au,un+Tu,un+Cu,un+wu]),eI=function(e,t,i){al(i);var r=e._gsap;if(r.spacerIsNative)al(r.spacerState);else if(e._gsap.swappedIn){var s=t.parentNode;s&&(s.insertBefore(e,t),s.removeChild(t))}e._gsap.swappedIn=!1},Ap=function(e,t,i,r){if(!e._gsap.swappedIn){for(var s=Fg.length,a=t.style,o=e.style,l;s--;)l=Fg[s],a[l]=i[l];a.position=i.position==="absolute"?"absolute":"relative",i.display==="inline"&&(a.display="inline-block"),o[f_]=o[c_]="auto",a.flexBasis=i.flexBasis||"auto",a.overflow="visible",a.boxSizing="border-box",a[Va]=bd(e,ri)+mn,a[Ha]=bd(e,_n)+mn,a[un]=o[ji]=o[kE]=o[OE]="0",al(r),o[Va]=o["max"+El]=i[Va],o[Ha]=o["max"+d_]=i[Ha],o[un]=i[un],e.parentNode!==t&&(e.parentNode.insertBefore(t,e),t.appendChild(e)),e._gsap.swappedIn=!0}},tI=/([A-Z])/g,al=function(e){if(e){var t=e.t.style,i=e.length,r=0,s,a;for((e.t._gsap||Ie.core.getCache(e.t)).uncache=1;r<i;r+=2)a=e[r+1],s=e[r],a?t[s]=a:t[s]&&t.removeProperty(s.replace(tI,"-$1").toLowerCase())}},hf=function(e){for(var t=Vf.length,i=e.style,r=[],s=0;s<t;s++)r.push(Vf[s],i[Vf[s]]);return r.t=e,r},nI=function(e,t,i){for(var r=[],s=e.length,a=i?8:0,o;a<s;a+=2)o=e[a],r.push(o,o in t?t[o]:e[a+1]);return r.t=e.t,r},Hf={left:0,top:0},yy=function(e,t,i,r,s,a,o,l,u,c,d,f,h,m){Xn(e)&&(e=e(l)),Ri(e)&&e.substr(0,3)==="max"&&(e=f+(e.charAt(4)==="="?kf("0"+e.substr(3),i):0));var _=h?h.time():0,g,p,v;if(h&&h.seek(0),isNaN(e)||(e=+e),su(e))h&&(e=Ie.utils.mapRange(h.scrollTrigger.start,h.scrollTrigger.end,0,f,e)),o&&Bf(o,i,r,!0);else{Xn(t)&&(t=t(l));var S=(e||"0").split(" "),x,E,T,w;v=ci(t,l)||yt,x=ns(v)||{},(!x||!x.left&&!x.top)&&Qi(v).display==="none"&&(w=v.style.display,v.style.display="block",x=ns(v),w?v.style.display=w:v.style.removeProperty("display")),E=kf(S[0],x[r.d]),T=kf(S[1]||"0",i),e=x[r.p]-u[r.p]-c+E+s-T,o&&Bf(o,T,r,i-T<20||o._isStart&&T>20),i-=i-T}if(m&&(l[m]=e||-.001,e<0&&(e=0)),a){var y=e+i,A=a._isStart;g="scroll"+r.d2,Bf(a,y,r,A&&y>20||!A&&(d?Math.max(yt[g],Di[g]):a.parentNode[g])<=y+1),d&&(u=ns(o),d&&(a.style[r.op.p]=u[r.op.p]-r.op.m-a._offset+mn))}return h&&v&&(g=ns(v),h.seek(f),p=ns(v),h._caScrollDist=g[r.p]-p[r.p],e=e/h._caScrollDist*f),h&&h.seek(_),h?e:Math.round(e)},iI=/(webkit|moz|length|cssText|inset)/i,Sy=function(e,t,i,r){if(e.parentNode!==t){var s=e.style,a,o;if(t===yt){e._stOrig=s.cssText,o=Qi(e);for(a in o)!+a&&!iI.test(a)&&o[a]&&typeof s[a]=="string"&&a!=="0"&&(s[a]=o[a]);s.top=i,s.left=r}else s.cssText=e._stOrig;Ie.core.getCache(e).uncache=1,t.appendChild(e)}},XE=function(e,t,i){var r=t,s=r;return function(a){var o=Math.round(e());return o!==r&&o!==s&&Math.abs(o-r)>3&&Math.abs(o-s)>3&&(a=o,i&&i()),s=r,r=Math.round(a),r}},pf=function(e,t,i){var r={};r[t.p]="+="+i,Ie.set(e,r)},My=function(e,t){var i=ua(e,t),r="_scroll"+t.p2,s=function a(o,l,u,c,d){var f=a.tween,h=l.onComplete,m={};u=u||i();var _=XE(i,u,function(){f.kill(),a.tween=0});return d=c&&d||0,c=c||o-u,f&&f.kill(),l[r]=o,l.inherit=!1,l.modifiers=m,m[r]=function(){return _(u+c*f.ratio+d*f.ratio*f.ratio)},l.onUpdate=function(){at.cache++,a.tween&&fs()},l.onComplete=function(){a.tween=0,h&&h.call(f)},f=a.tween=Ie.to(e,l),f};return e[r]=i,i.wheelHandler=function(){return s.tween&&s.tween.kill()&&(s.tween=0)},wn(e,"wheel",i.wheelHandler),ot.isTouch&&wn(e,"touchmove",i.wheelHandler),s},ot=function(){function n(t,i){Ro||n.register(Ie)||console.warn("Please gsap.registerPlugin(ScrollTrigger)"),Lg(this),this.init(t,i)}var e=n.prototype;return e.init=function(i,r){if(this.progress=this.start=0,this.vars&&this.kill(!0,!0),!iu){this.update=this.refresh=this.kill=br;return}i=my(Ri(i)||su(i)||i.nodeType?{trigger:i}:i,ff);var s=i,a=s.onUpdate,o=s.toggleClass,l=s.id,u=s.onToggle,c=s.onRefresh,d=s.scrub,f=s.trigger,h=s.pin,m=s.pinSpacing,_=s.invalidateOnRefresh,g=s.anticipatePin,p=s.onScrubComplete,v=s.onSnapComplete,S=s.once,x=s.snap,E=s.pinReparent,T=s.pinSpacer,w=s.containerAnimation,y=s.fastScrollEnd,A=s.preventOverlaps,R=i.horizontal||i.containerAnimation&&i.horizontal!==!1?ri:_n,D=!d&&d!==0,L=ci(i.scroller||st),z=Ie.core.getCache(L),I=ja(L),F=("pinType"in i?i.pinType:na(L,"pinType")||I&&"fixed")==="fixed",G=[i.onEnter,i.onLeave,i.onEnterBack,i.onLeaveBack],U=D&&i.toggleActions.split(" "),N="markers"in i?i.markers:ff.markers,O=I?0:parseFloat(Qi(L)["border"+R.p2+El])||0,b=this,Q=i.onRefreshInit&&function(){return i.onRefreshInit(b)},te=qN(L,I,R),Oe=$N(L,I),be=0,Ce=0,$=0,se=ua(L,R),re,Ae,De,ye,je,me,Re,Ne,ke,W,et,ut,Pt,Ke,xt,B,Yt,qe,P,M,H,Y,J,he,ce,ee,ne,_e,Ue,ve,ge,de,ze,Ge,k,pe,ie,xe,Se;if(b._startClamp=b._endClamp=!1,b._dir=R,g*=45,b.scroller=L,b.scroll=w?w.time.bind(w):se,ye=se(),b.vars=i,r=r||i.animation,"refreshPriority"in i&&(bE=1,i.refreshPriority===-9999&&(Ru=b)),z.tweenScroll=z.tweenScroll||{top:My(L,_n),left:My(L,ri)},b.tweenTo=re=z.tweenScroll[R.p],b.scrubDuration=function(ue){ze=su(ue)&&ue,ze?de?de.duration(ue):de=Ie.to(r,{ease:"expo",totalProgress:"+=0",inherit:!1,duration:ze,paused:!0,onComplete:function(){return p&&p(b)}}):(de&&de.progress(1).kill(),de=0)},r&&(r.vars.lazy=!1,r._initted&&!b.isReverted||r.vars.immediateRender!==!1&&i.immediateRender!==!1&&r.duration()&&r.render(0,!0,!0),b.animation=r.pause(),r.scrollTrigger=b,b.scrubDuration(d),ve=0,l||(l=r.vars.id)),x&&((!wa(x)||x.push)&&(x={snapTo:x}),"scrollBehavior"in yt.style&&Ie.set(I?[yt,Di]:L,{scrollBehavior:"auto"}),at.forEach(function(ue){return Xn(ue)&&ue.target===(I?St.scrollingElement||Di:L)&&(ue.smooth=!1)}),De=Xn(x.snapTo)?x.snapTo:x.snapTo==="labels"?ZN(r):x.snapTo==="labelsDirectional"?jN(r):x.directional!==!1?function(ue,Xe){return h_(x.snapTo)(ue,Hn()-Ce<500?0:Xe.direction)}:Ie.utils.snap(x.snapTo),Ge=x.duration||{min:.1,max:2},Ge=wa(Ge)?Mu(Ge.min,Ge.max):Mu(Ge,Ge),k=Ie.delayedCall(x.delay||ze/2||.1,function(){var ue=se(),Xe=Hn()-Ce<500,Fe=re.tween;if((Xe||Math.abs(b.getVelocity())<10)&&!Fe&&!th&&be!==ue){var Ze=(ue-me)/Ke,sn=r&&!D?r.totalProgress():Ze,rt=Xe?0:(sn-ge)/(Hn()-nu)*1e3||0,It=Ie.utils.clamp(-Ze,1-Ze,wo(rt/2)*rt/.185),Sn=Ze+(x.inertia===!1?0:It),Ut,wt,ct=x,Kn=ct.onStart,Dt=ct.onInterrupt,Un=ct.onComplete;if(Ut=De(Sn,b),su(Ut)||(Ut=Sn),wt=Math.max(0,Math.round(me+Ut*Ke)),ue<=Re&&ue>=me&&wt!==ue){if(Fe&&!Fe._initted&&Fe.data<=wo(wt-ue))return;x.inertia===!1&&(It=Ut-Ze),re(wt,{duration:Ge(wo(Math.max(wo(Sn-sn),wo(Ut-sn))*.185/rt/.05||0)),ease:x.ease||"power3",data:wo(wt-ue),onInterrupt:function(){return k.restart(!0)&&Dt&&To(b,Dt)},onComplete:function(){b.update(),be=se(),r&&!D&&(de?de.resetTo("totalProgress",Ut,r._tTime/r._tDur):r.progress(Ut)),ve=ge=r&&!D?r.totalProgress():b.progress,v&&v(b),Un&&To(b,Un)}},ue,It*Ke,wt-ue-It*Ke),Kn&&To(b,Kn,re.tween)}}else b.isActive&&be!==ue&&k.restart(!0)}).pause()),l&&(Ig[l]=b),f=b.trigger=ci(f||h!==!0&&h),Se=f&&f._gsap&&f._gsap.stRevert,Se&&(Se=Se(b)),h=h===!0?f:ci(h),Ri(o)&&(o={targets:f,className:o}),h&&(m===!1||m===ji||(m=!m&&h.parentNode&&h.parentNode.style&&Qi(h.parentNode).display==="flex"?!1:un),b.pin=h,Ae=Ie.core.getCache(h),Ae.spacer?xt=Ae.pinState:(T&&(T=ci(T),T&&!T.nodeType&&(T=T.current||T.nativeElement),Ae.spacerIsNative=!!T,T&&(Ae.spacerState=hf(T))),Ae.spacer=qe=T||St.createElement("div"),qe.classList.add("pin-spacer"),l&&qe.classList.add("pin-spacer-"+l),Ae.pinState=xt=hf(h)),i.force3D!==!1&&Ie.set(h,{force3D:!0}),b.spacer=qe=Ae.spacer,Ue=Qi(h),he=Ue[m+R.os2],M=Ie.getProperty(h),H=Ie.quickSetter(h,R.a,mn),Ap(h,qe,Ue),Yt=hf(h)),N){ut=wa(N)?my(N,gy):gy,W=df("scroller-start",l,L,R,ut,0),et=df("scroller-end",l,L,R,ut,0,W),P=W["offset"+R.op.d2];var ae=ci(na(L,"content")||L);Ne=this.markerStart=df("start",l,ae,R,ut,P,0,w),ke=this.markerEnd=df("end",l,ae,R,ut,P,0,w),w&&(xe=Ie.quickSetter([Ne,ke],R.a,mn)),!F&&!(Hr.length&&na(L,"fixedMarkers")===!0)&&(KN(I?yt:L),Ie.set([W,et],{force3D:!0}),ee=Ie.quickSetter(W,R.a,mn),_e=Ie.quickSetter(et,R.a,mn))}if(w){var le=w.vars.onUpdate,oe=w.vars.onUpdateParams;w.eventCallback("onUpdate",function(){b.update(0,0,1),le&&le.apply(w,oe||[])})}if(b.previous=function(){return it[it.indexOf(b)-1]},b.next=function(){return it[it.indexOf(b)+1]},b.revert=function(ue,Xe){if(!Xe)return b.kill(!0);var Fe=ue!==!1||!b.enabled,Ze=Vn;Fe!==b.isReverted&&(Fe&&(pe=Math.max(se(),b.scroll.rec||0),$=b.progress,ie=r&&r.progress()),Ne&&[Ne,ke,W,et].forEach(function(sn){return sn.style.display=Fe?"none":"block"}),Fe&&(Vn=b,b.update(Fe)),h&&(!E||!b.isActive)&&(Fe?eI(h,qe,xt):Ap(h,qe,Qi(h),ce)),Fe||b.update(Fe),Vn=Ze,b.isReverted=Fe)},b.refresh=function(ue,Xe,Fe,Ze){if(!((Vn||!b.enabled)&&!Xe)){if(h&&ue&&rr){wn(n,"scrollEnd",zE);return}!ii&&Q&&Q(b),Vn=b,re.tween&&!Fe&&(re.tween.kill(),re.tween=0),de&&de.pause(),_&&r&&(r.revert({kill:!1}).invalidate(),r.getChildren?r.getChildren(!0,!0,!1).forEach(function(Ee){return Ee.vars.immediateRender&&Ee.render(0,!0,!0)}):r.vars.immediateRender&&r.render(0,!0,!0)),b.isReverted||b.revert(!0,!0),b._subPinOffset=!1;var sn=te(),rt=Oe(),It=w?w.duration():Fr(L,R),Sn=Ke<=.01||!Ke,Ut=0,wt=Ze||0,ct=wa(Fe)?Fe.end:i.end,Kn=i.endTrigger||f,Dt=wa(Fe)?Fe.start:i.start||(i.start===0||!f?0:h?"0 0":"0 100%"),Un=b.pinnedContainer=i.pinnedContainer&&ci(i.pinnedContainer,b),Zn=f&&Math.max(0,it.indexOf(b))||0,an=Zn,qt,pn,Mr,ro,Mn,Qt,Xi,C,V,K,X,q,Me;for(N&&wa(Fe)&&(q=Ie.getProperty(W,R.p),Me=Ie.getProperty(et,R.p));an-- >0;)Qt=it[an],Qt.end||Qt.refresh(0,1)||(Vn=b),Xi=Qt.pin,Xi&&(Xi===f||Xi===h||Xi===Un)&&!Qt.isReverted&&(K||(K=[]),K.unshift(Qt),Qt.revert(!0,!0)),Qt!==it[an]&&(Zn--,an--);for(Xn(Dt)&&(Dt=Dt(b)),Dt=fy(Dt,"start",b),me=yy(Dt,f,sn,R,se(),Ne,W,b,rt,O,F,It,w,b._startClamp&&"_startClamp")||(h?-.001:0),Xn(ct)&&(ct=ct(b)),Ri(ct)&&!ct.indexOf("+=")&&(~ct.indexOf(" ")?ct=(Ri(Dt)?Dt.split(" ")[0]:"")+ct:(Ut=kf(ct.substr(2),sn),ct=Ri(Dt)?Dt:(w?Ie.utils.mapRange(0,w.duration(),w.scrollTrigger.start,w.scrollTrigger.end,me):me)+Ut,Kn=f)),ct=fy(ct,"end",b),Re=Math.max(me,yy(ct||(Kn?"100% 0":It),Kn,sn,R,se()+Ut,ke,et,b,rt,O,F,It,w,b._endClamp&&"_endClamp"))||-.001,Ut=0,an=Zn;an--;)Qt=it[an]||{},Xi=Qt.pin,Xi&&Qt.start-Qt._pinPush<=me&&!w&&Qt.end>0&&(qt=Qt.end-(b._startClamp?Math.max(0,Qt.start):Qt.start),(Xi===f&&Qt.start-Qt._pinPush<me||Xi===Un)&&isNaN(Dt)&&(Ut+=qt*(1-Qt.progress)),Xi===h&&(wt+=qt));if(me+=Ut,Re+=Ut,b._startClamp&&(b._startClamp+=Ut),b._endClamp&&!ii&&(b._endClamp=Re||-.001,Re=Math.min(Re,Fr(L,R))),Ke=Re-me||(me-=.01)&&.001,Sn&&($=Ie.utils.clamp(0,1,Ie.utils.normalize(me,Re,pe))),b._pinPush=wt,Ne&&Ut&&(qt={},qt[R.a]="+="+Ut,Un&&(qt[R.p]="-="+se()),Ie.set([Ne,ke],qt)),h&&!(Ng&&b.end>=Fr(L,R)))qt=Qi(h),ro=R===_n,Mr=se(),Y=parseFloat(M(R.a))+wt,!It&&Re>1&&(X=(I?St.scrollingElement||Di:L).style,X={style:X,value:X["overflow"+R.a.toUpperCase()]},I&&Qi(yt)["overflow"+R.a.toUpperCase()]!=="scroll"&&(X.style["overflow"+R.a.toUpperCase()]="scroll")),Ap(h,qe,qt),Yt=hf(h),pn=ns(h,!0),C=F&&ua(L,ro?ri:_n)(),m?(ce=[m+R.os2,Ke+wt+mn],ce.t=qe,an=m===un?bd(h,R)+Ke+wt:0,an&&(ce.push(R.d,an+mn),qe.style.flexBasis!=="auto"&&(qe.style.flexBasis=an+mn)),al(ce),Un&&it.forEach(function(Ee){Ee.pin===Un&&Ee.vars.pinSpacing!==!1&&(Ee._subPinOffset=!0)}),F&&se(pe)):(an=bd(h,R),an&&qe.style.flexBasis!=="auto"&&(qe.style.flexBasis=an+mn)),F&&(Mn={top:pn.top+(ro?Mr-me:C)+mn,left:pn.left+(ro?C:Mr-me)+mn,boxSizing:"border-box",position:"fixed"},Mn[Va]=Mn["max"+El]=Math.ceil(pn.width)+mn,Mn[Ha]=Mn["max"+d_]=Math.ceil(pn.height)+mn,Mn[ji]=Mn[ji+Au]=Mn[ji+Tu]=Mn[ji+Cu]=Mn[ji+wu]="0",Mn[un]=qt[un],Mn[un+Au]=qt[un+Au],Mn[un+Tu]=qt[un+Tu],Mn[un+Cu]=qt[un+Cu],Mn[un+wu]=qt[un+wu],B=nI(xt,Mn,E),ii&&se(0)),r?(V=r._initted,Mp(1),r.render(r.duration(),!0,!0),J=M(R.a)-Y+Ke+wt,ne=Math.abs(Ke-J)>1,F&&ne&&B.splice(B.length-2,2),r.render(0,!0,!0),V||r.invalidate(!0),r.parent||r.totalTime(r.totalTime()),Mp(0)):J=Ke,X&&(X.value?X.style["overflow"+R.a.toUpperCase()]=X.value:X.style.removeProperty("overflow-"+R.a));else if(f&&se()&&!w)for(pn=f.parentNode;pn&&pn!==yt;)pn._pinOffset&&(me-=pn._pinOffset,Re-=pn._pinOffset),pn=pn.parentNode;K&&K.forEach(function(Ee){return Ee.revert(!1,!0)}),b.start=me,b.end=Re,ye=je=ii?pe:se(),!w&&!ii&&(ye<pe&&se(pe),b.scroll.rec=0),b.revert(!1,!0),Ce=Hn(),k&&(be=-1,k.restart(!0)),Vn=0,r&&D&&(r._initted||ie)&&r.progress()!==ie&&r.progress(ie||0,!0).render(r.time(),!0,!0),(Sn||$!==b.progress||w||_||r&&!r._initted)&&(r&&!D&&(r._initted||$||r.vars.immediateRender!==!1)&&r.totalProgress(w&&me<-.001&&!$?Ie.utils.normalize(me,Re,0):$,!0),b.progress=Sn||(ye-me)/Ke===$?0:$),h&&m&&(qe._pinOffset=Math.round(b.progress*J)),de&&de.invalidate(),isNaN(q)||(q-=Ie.getProperty(W,R.p),Me-=Ie.getProperty(et,R.p),pf(W,R,q),pf(Ne,R,q-(Ze||0)),pf(et,R,Me),pf(ke,R,Me-(Ze||0))),Sn&&!ii&&b.update(),c&&!ii&&!Pt&&(Pt=!0,c(b),Pt=!1)}},b.getVelocity=function(){return(se()-je)/(Hn()-nu)*1e3||0},b.endAnimation=function(){ql(b.callbackAnimation),r&&(de?de.progress(1):r.paused()?D||ql(r,b.direction<0,1):ql(r,r.reversed()))},b.labelToScroll=function(ue){return r&&r.labels&&(me||b.refresh()||me)+r.labels[ue]/r.duration()*Ke||0},b.getTrailing=function(ue){var Xe=it.indexOf(b),Fe=b.direction>0?it.slice(0,Xe).reverse():it.slice(Xe+1);return(Ri(ue)?Fe.filter(function(Ze){return Ze.vars.preventOverlaps===ue}):Fe).filter(function(Ze){return b.direction>0?Ze.end<=me:Ze.start>=Re})},b.update=function(ue,Xe,Fe){if(!(w&&!Fe&&!ue)){var Ze=ii===!0?pe:b.scroll(),sn=ue?0:(Ze-me)/Ke,rt=sn<0?0:sn>1?1:sn||0,It=b.progress,Sn,Ut,wt,ct,Kn,Dt,Un,Zn;if(Xe&&(je=ye,ye=w?se():Ze,x&&(ge=ve,ve=r&&!D?r.totalProgress():rt)),g&&h&&!Vn&&!of&&rr&&(!rt&&me<Ze+(Ze-je)/(Hn()-nu)*g?rt=1e-4:rt===1&&Re>Ze+(Ze-je)/(Hn()-nu)*g&&(rt=.9999)),rt!==It&&b.enabled){if(Sn=b.isActive=!!rt&&rt<1,Ut=!!It&&It<1,Dt=Sn!==Ut,Kn=Dt||!!rt!=!!It,b.direction=rt>It?1:-1,b.progress=rt,Kn&&!Vn&&(wt=rt&&!It?0:rt===1?1:It===1?2:3,D&&(ct=!Dt&&U[wt+1]!=="none"&&U[wt+1]||U[wt],Zn=r&&(ct==="complete"||ct==="reset"||ct in r))),A&&(Dt||Zn)&&(Zn||d||!r)&&(Xn(A)?A(b):b.getTrailing(A).forEach(function(Mr){return Mr.endAnimation()})),D||(de&&!Vn&&!of?(de._dp._time-de._start!==de._time&&de.render(de._dp._time-de._start),de.resetTo?de.resetTo("totalProgress",rt,r._tTime/r._tDur):(de.vars.totalProgress=rt,de.invalidate().restart())):r&&r.totalProgress(rt,!!(Vn&&(Ce||ue)))),h){if(ue&&m&&(qe.style[m+R.os2]=he),!F)H(ru(Y+J*rt));else if(Kn){if(Un=!ue&&rt>It&&Re+1>Ze&&Ze+1>=Fr(L,R),E)if(!ue&&(Sn||Un)){var an=ns(h,!0),qt=Ze-me;Sy(h,yt,an.top+(R===_n?qt:0)+mn,an.left+(R===_n?0:qt)+mn)}else Sy(h,qe);al(Sn||Un?B:Yt),ne&&rt<1&&Sn||H(Y+(rt===1&&!Un?J:0))}}x&&!re.tween&&!Vn&&!of&&k.restart(!0),o&&(Dt||S&&rt&&(rt<1||!Ep))&&ic(o.targets).forEach(function(Mr){return Mr.classList[Sn||S?"add":"remove"](o.className)}),a&&!D&&!ue&&a(b),Kn&&!Vn?(D&&(Zn&&(ct==="complete"?r.pause().totalProgress(1):ct==="reset"?r.restart(!0).pause():ct==="restart"?r.restart(!0):r[ct]()),a&&a(b)),(Dt||!Ep)&&(u&&Dt&&To(b,u),G[wt]&&To(b,G[wt]),S&&(rt===1?b.kill(!1,1):G[wt]=0),Dt||(wt=rt===1?1:3,G[wt]&&To(b,G[wt]))),y&&!Sn&&Math.abs(b.getVelocity())>(su(y)?y:2500)&&(ql(b.callbackAnimation),de?de.progress(1):ql(r,ct==="reverse"?1:!rt,1))):D&&a&&!Vn&&a(b)}if(_e){var pn=w?Ze/w.duration()*(w._caScrollDist||0):Ze;ee(pn+(W._isFlipped?1:0)),_e(pn)}xe&&xe(-Ze/w.duration()*(w._caScrollDist||0))}},b.enable=function(ue,Xe){b.enabled||(b.enabled=!0,wn(L,"resize",au),I||wn(L,"scroll",Ao),Q&&wn(n,"refreshInit",Q),ue!==!1&&(b.progress=$=0,ye=je=be=se()),Xe!==!1&&b.refresh())},b.getTween=function(ue){return ue&&re?re.tween:de},b.setPositions=function(ue,Xe,Fe,Ze){if(w){var sn=w.scrollTrigger,rt=w.duration(),It=sn.end-sn.start;ue=sn.start+It*ue/rt,Xe=sn.start+It*Xe/rt}b.refresh(!1,!1,{start:dy(ue,Fe&&!!b._startClamp),end:dy(Xe,Fe&&!!b._endClamp)},Ze),b.update()},b.adjustPinSpacing=function(ue){if(ce&&ue){var Xe=ce.indexOf(R.d)+1;ce[Xe]=parseFloat(ce[Xe])+ue+mn,ce[1]=parseFloat(ce[1])+ue+mn,al(ce)}},b.disable=function(ue,Xe){if(ue!==!1&&b.revert(!0,!0),b.enabled&&(b.enabled=b.isActive=!1,Xe||de&&de.pause(),pe=0,Ae&&(Ae.uncache=1),Q&&Tn(n,"refreshInit",Q),k&&(k.pause(),re.tween&&re.tween.kill()&&(re.tween=0)),!I)){for(var Fe=it.length;Fe--;)if(it[Fe].scroller===L&&it[Fe]!==b)return;Tn(L,"resize",au),I||Tn(L,"scroll",Ao)}},b.kill=function(ue,Xe){b.disable(ue,Xe),de&&!Xe&&de.kill(),l&&delete Ig[l];var Fe=it.indexOf(b);Fe>=0&&it.splice(Fe,1),Fe===ni&&zf>0&&ni--,Fe=0,it.forEach(function(Ze){return Ze.scroller===b.scroller&&(Fe=1)}),Fe||ii||(b.scroll.rec=0),r&&(r.scrollTrigger=null,ue&&r.revert({kill:!1}),Xe||r.kill()),Ne&&[Ne,ke,W,et].forEach(function(Ze){return Ze.parentNode&&Ze.parentNode.removeChild(Ze)}),Ru===b&&(Ru=0),h&&(Ae&&(Ae.uncache=1),Fe=0,it.forEach(function(Ze){return Ze.pin===h&&Fe++}),Fe||(Ae.spacer=0)),i.onKill&&i.onKill(b)},it.push(b),b.enable(!1,!1),Se&&Se(b),r&&r.add&&!Ke){var We=b.update;b.update=function(){b.update=We,at.cache++,me||Re||b.refresh()},Ie.delayedCall(.01,b.update),Ke=.01,me=Re=0}else b.refresh();h&&JN()},n.register=function(i){return Ro||(Ie=i||IE(),NE()&&window.document&&n.enable(),Ro=iu),Ro},n.defaults=function(i){if(i)for(var r in i)ff[r]=i[r];return ff},n.disable=function(i,r){iu=0,it.forEach(function(a){return a[r?"kill":"disable"](i)}),Tn(st,"wheel",Ao),Tn(St,"scroll",Ao),clearInterval(af),Tn(St,"touchcancel",br),Tn(yt,"touchstart",br),uf(Tn,St,"pointerdown,touchstart,mousedown",hy),uf(Tn,St,"pointerup,touchend,mouseup",py),Rd.kill(),lf(Tn);for(var s=0;s<at.length;s+=3)cf(Tn,at[s],at[s+1]),cf(Tn,at[s],at[s+2])},n.enable=function(){if(st=window,St=document,Di=St.documentElement,yt=St.body,Ie){if(ic=Ie.utils.toArray,Mu=Ie.utils.clamp,Lg=Ie.core.context||br,Mp=Ie.core.suppressOverwrites||br,l_=st.history.scrollRestoration||"auto",Ug=st.pageYOffset||0,Ie.core.globals("ScrollTrigger",n),yt){iu=1,sl=document.createElement("div"),sl.style.height="100vh",sl.style.position="absolute",WE(),YN(),rn.register(Ie),n.isTouch=rn.isTouch,Ls=rn.isTouch&&/(iPad|iPhone|iPod|Mac)/g.test(navigator.userAgent),Dg=rn.isTouch===1,wn(st,"wheel",Ao),o_=[st,St,Di,yt],Ie.matchMedia?(n.matchMedia=function(c){var d=Ie.matchMedia(),f;for(f in c)d.add(f,c[f]);return d},Ie.addEventListener("matchMediaInit",function(){HE(),p_()}),Ie.addEventListener("matchMediaRevert",function(){return VE()}),Ie.addEventListener("matchMedia",function(){Ia(0,1),Ja("matchMedia")}),Ie.matchMedia().add("(orientation: portrait)",function(){return wp(),wp})):console.warn("Requires GSAP 3.11.0 or later"),wp(),wn(St,"scroll",Ao);var i=yt.hasAttribute("style"),r=yt.style,s=r.borderTopStyle,a=Ie.core.Animation.prototype,o,l;for(a.revert||Object.defineProperty(a,"revert",{value:function(){return this.time(-.01,!0)}}),r.borderTopStyle="solid",o=ns(yt),_n.m=Math.round(o.top+_n.sc())||0,ri.m=Math.round(o.left+ri.sc())||0,s?r.borderTopStyle=s:r.removeProperty("border-top-style"),i||(yt.setAttribute("style",""),yt.removeAttribute("style")),af=setInterval(_y,250),Ie.delayedCall(.5,function(){return of=0}),wn(St,"touchcancel",br),wn(yt,"touchstart",br),uf(wn,St,"pointerdown,touchstart,mousedown",hy),uf(wn,St,"pointerup,touchend,mouseup",py),Pg=Ie.utils.checkPrefix("transform"),Vf.push(Pg),Ro=Hn(),Rd=Ie.delayedCall(.2,Ia).pause(),bo=[St,"visibilitychange",function(){var c=st.innerWidth,d=st.innerHeight;St.hidden?(uy=c,cy=d):(uy!==c||cy!==d)&&au()},St,"DOMContentLoaded",Ia,st,"load",Ia,st,"resize",au],lf(wn),it.forEach(function(c){return c.enable(0,1)}),l=0;l<at.length;l+=3)cf(Tn,at[l],at[l+1]),cf(Tn,at[l],at[l+2])}else if(St){var u=function c(){n.enable(),St.removeEventListener("DOMContentLoaded",c)};St.addEventListener("DOMContentLoaded",u)}}},n.config=function(i){"limitCallbacks"in i&&(Ep=!!i.limitCallbacks);var r=i.syncInterval;r&&clearInterval(af)||(af=r)&&setInterval(_y,r),"ignoreMobileResize"in i&&(Dg=n.isTouch===1&&i.ignoreMobileResize),"autoRefreshEvents"in i&&(lf(Tn)||lf(wn,i.autoRefreshEvents||"none"),PE=(i.autoRefreshEvents+"").indexOf("resize")===-1)},n.scrollerProxy=function(i,r){var s=ci(i),a=at.indexOf(s),o=ja(s);~a&&at.splice(a,o?6:2),r&&(o?Hr.unshift(st,r,yt,r,Di,r):Hr.unshift(s,r))},n.clearMatchMedia=function(i){it.forEach(function(r){return r._ctx&&r._ctx.query===i&&r._ctx.kill(!0,!0)})},n.isInViewport=function(i,r,s){var a=(Ri(i)?ci(i):i).getBoundingClientRect(),o=a[s?Va:Ha]*r||0;return s?a.right-o>0&&a.left+o<st.innerWidth:a.bottom-o>0&&a.top+o<st.innerHeight},n.positionInViewport=function(i,r,s){Ri(i)&&(i=ci(i));var a=i.getBoundingClientRect(),o=a[s?Va:Ha],l=r==null?o/2:r in Pd?Pd[r]*o:~r.indexOf("%")?parseFloat(r)*o/100:parseFloat(r)||0;return s?(a.left+l)/st.innerWidth:(a.top+l)/st.innerHeight},n.killAll=function(i){if(it.slice(0).forEach(function(s){return s.vars.id!=="ScrollSmoother"&&s.kill()}),i!==!0){var r=Qa.killAll||[];Qa={},r.forEach(function(s){return s()})}},n}();ot.version="3.15.0";ot.saveStyles=function(n){return n?ic(n).forEach(function(e){if(e&&e.style){var t=Ai.indexOf(e);t>=0&&Ai.splice(t,5),Ai.push(e,e.style.cssText,e.getBBox&&e.getAttribute("transform"),Ie.core.getCache(e),Lg())}}):Ai};ot.revert=function(n,e){return p_(!n,e)};ot.create=function(n,e){return new ot(n,e)};ot.refresh=function(n){return n?au(!0):(Ro||ot.register())&&Ia(!0)};ot.update=function(n){return++at.cache&&fs(n===!0?2:0)};ot.clearScrollMemory=GE;ot.maxScroll=function(n,e){return Fr(n,e?ri:_n)};ot.getScrollFunc=function(n,e){return ua(ci(n),e?ri:_n)};ot.getById=function(n){return Ig[n]};ot.getAll=function(){return it.filter(function(n){return n.vars.id!=="ScrollSmoother"})};ot.isScrolling=function(){return!!rr};ot.snapDirectional=h_;ot.addEventListener=function(n,e){var t=Qa[n]||(Qa[n]=[]);~t.indexOf(e)||t.push(e)};ot.removeEventListener=function(n,e){var t=Qa[n],i=t&&t.indexOf(e);i>=0&&t.splice(i,1)};ot.batch=function(n,e){var t=[],i={},r=e.interval||.016,s=e.batchMax||1e9,a=function(u,c){var d=[],f=[],h=Ie.delayedCall(r,function(){c(d,f),d=[],f=[]}).pause();return function(m){d.length||h.restart(!0),d.push(m.trigger),f.push(m),s<=d.length&&h.progress(1)}},o;for(o in e)i[o]=o.substr(0,2)==="on"&&Xn(e[o])&&o!=="onRefreshInit"?a(o,e[o]):e[o];return Xn(s)&&(s=s(),wn(ot,"refresh",function(){return s=e.batchMax()})),ic(n).forEach(function(l){var u={};for(o in i)u[o]=i[o];u.trigger=l,t.push(ot.create(u))}),t};var Ey=function(e,t,i,r){return t>r?e(r):t<0&&e(0),i>r?(r-t)/(i-t):i<0?t/(t-i):1},Cp=function n(e,t){t===!0?e.style.removeProperty("touch-action"):e.style.touchAction=t===!0?"auto":t?"pan-"+t+(rn.isTouch?" pinch-zoom":""):"none",e===Di&&n(yt,t)},mf={auto:1,scroll:1},rI=function(e){var t=e.event,i=e.target,r=e.axis,s=(t.changedTouches?t.changedTouches[0]:t).target,a=s._gsap||Ie.core.getCache(s),o=Hn(),l;if(!a._isScrollT||o-a._isScrollT>2e3){for(;s&&s!==yt&&(s.scrollHeight<=s.clientHeight&&s.scrollWidth<=s.clientWidth||!(mf[(l=Qi(s)).overflowY]||mf[l.overflowX]));)s=s.parentNode;a._isScroll=s&&s!==i&&!ja(s)&&(mf[(l=Qi(s)).overflowY]||mf[l.overflowX]),a._isScrollT=o}(a._isScroll||r==="x")&&(t.stopPropagation(),t._gsapAllow=!0)},YE=function(e,t,i,r){return rn.create({target:e,capture:!0,debounce:!1,lockAxis:!0,type:t,onWheel:r=r&&rI,onPress:r,onDrag:r,onScroll:r,onEnable:function(){return i&&wn(St,rn.eventTypes[0],wy,!1,!0)},onDisable:function(){return Tn(St,rn.eventTypes[0],wy,!0)}})},sI=/(input|label|select|textarea)/i,Ty,wy=function(e){var t=sI.test(e.target.tagName);(t||Ty)&&(e._gsapAllow=!0,Ty=t)},aI=function(e){wa(e)||(e={}),e.preventDefault=e.isNormalizer=e.allowClicks=!0,e.type||(e.type="wheel,touch"),e.debounce=!!e.debounce,e.id=e.id||"normalizer";var t=e,i=t.normalizeScrollX,r=t.momentum,s=t.allowNestedScroll,a=t.onRelease,o,l,u=ci(e.target)||Di,c=Ie.core.globals().ScrollSmoother,d=c&&c.get(),f=Ls&&(e.content&&ci(e.content)||d&&e.content!==!1&&!d.smooth()&&d.content()),h=ua(u,_n),m=ua(u,ri),_=1,g=(rn.isTouch&&st.visualViewport?st.visualViewport.scale*st.visualViewport.width:st.outerWidth)/st.innerWidth,p=0,v=Xn(r)?function(){return r(o)}:function(){return r||2.8},S,x,E=YE(u,e.type,!0,s),T=function(){return x=!1},w=br,y=br,A=function(){l=Fr(u,_n),y=Mu(Ls?1:0,l),i&&(w=Mu(0,Fr(u,ri))),S=Ga},R=function(){f._gsap.y=ru(parseFloat(f._gsap.y)+h.offset)+"px",f.style.transform="matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, "+parseFloat(f._gsap.y)+", 0, 1)",h.offset=h.cacheID=0},D=function(){if(x){requestAnimationFrame(T);var N=ru(o.deltaY/2),O=y(h.v-N);if(f&&O!==h.v+h.offset){h.offset=O-h.v;var b=ru((parseFloat(f&&f._gsap.y)||0)-h.offset);f.style.transform="matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, "+b+", 0, 1)",f._gsap.y=b+"px",h.cacheID=at.cache,fs()}return!0}h.offset&&R(),x=!0},L,z,I,F,G=function(){A(),L.isActive()&&L.vars.scrollY>l&&(h()>l?L.progress(1)&&h(l):L.resetTo("scrollY",l))};return f&&Ie.set(f,{y:"+=0"}),e.ignoreCheck=function(U){return Ls&&U.type==="touchmove"&&D()||_>1.05&&U.type!=="touchstart"||o.isGesturing||U.touches&&U.touches.length>1},e.onPress=function(){x=!1;var U=_;_=ru((st.visualViewport&&st.visualViewport.scale||1)/g),L.pause(),U!==_&&Cp(u,_>1.01?!0:i?!1:"x"),z=m(),I=h(),A(),S=Ga},e.onRelease=e.onGestureStart=function(U,N){if(h.offset&&R(),!N)F.restart(!0);else{at.cache++;var O=v(),b,Q;i&&(b=m(),Q=b+O*.05*-U.velocityX/.227,O*=Ey(m,b,Q,Fr(u,ri)),L.vars.scrollX=w(Q)),b=h(),Q=b+O*.05*-U.velocityY/.227,O*=Ey(h,b,Q,Fr(u,_n)),L.vars.scrollY=y(Q),L.invalidate().duration(O).play(.01),(Ls&&L.vars.scrollY>=l||b>=l-1)&&Ie.to({},{onUpdate:G,duration:O})}a&&a(U)},e.onWheel=function(){L._ts&&L.pause(),Hn()-p>1e3&&(S=0,p=Hn())},e.onChange=function(U,N,O,b,Q){if(Ga!==S&&A(),N&&i&&m(w(b[2]===N?z+(U.startX-U.x):m()+N-b[1])),O){h.offset&&R();var te=Q[2]===O,Oe=te?I+U.startY-U.y:h()+O-Q[1],be=y(Oe);te&&Oe!==be&&(I+=be-Oe),h(be)}(O||N)&&fs()},e.onEnable=function(){Cp(u,i?!1:"x"),ot.addEventListener("refresh",G),wn(st,"resize",G),h.smooth&&(h.target.style.scrollBehavior="auto",h.smooth=m.smooth=!1),E.enable()},e.onDisable=function(){Cp(u,!0),Tn(st,"resize",G),ot.removeEventListener("refresh",G),E.kill()},e.lockAxis=e.lockAxis!==!1,o=new rn(e),o.iOS=Ls,Ls&&!h()&&h(1),Ls&&Ie.ticker.add(br),F=o._dc,L=Ie.to(o,{ease:"power4",paused:!0,inherit:!1,scrollX:i?"+=0.1":"+=0",scrollY:"+=0.1",modifiers:{scrollY:XE(h,h(),function(){return L.pause()})},onUpdate:fs,onComplete:F.vars.onComplete}),o};ot.sort=function(n){if(Xn(n))return it.sort(n);var e=st.pageYOffset||0;return ot.getAll().forEach(function(t){return t._sortY=t.trigger?e+t.trigger.getBoundingClientRect().top:t.start+st.innerHeight}),it.sort(n||function(t,i){return(t.vars.refreshPriority||0)*-1e6+(t.vars.containerAnimation?1e6:t._sortY)-((i.vars.containerAnimation?1e6:i._sortY)+(i.vars.refreshPriority||0)*-1e6)})};ot.observe=function(n){return new rn(n)};ot.normalizeScroll=function(n){if(typeof n>"u")return ei;if(n===!0&&ei)return ei.enable();if(n===!1){ei&&ei.kill(),ei=n;return}var e=n instanceof rn?n:aI(n);return ei&&ei.target===e.target&&ei.kill(),ja(e.target)&&(ei=e),e};ot.core={_getVelocityProp:bg,_inputObserver:YE,_scrollers:at,_proxies:Hr,bridge:{ss:function(){rr||Ja("scrollStart"),rr=Hn()},ref:function(){return Vn}}};IE()&&Ie.registerPlugin(ot);ln.registerPlugin(ot);function oI(){Ye.useEffect(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const n=ln.context(()=>{const e="power4.out",t="power4.inOut";ln.timeline({defaults:{ease:e}}).to(".hero-intro-panel.top",{yPercent:-102,duration:1.35,ease:t},0).to(".hero-intro-panel.bottom",{yPercent:102,duration:1.35,ease:t},0).to(".hero-intro-brand",{autoAlpha:0,y:-52,duration:.85,ease:"power3.out"},.3).set(".hero-intro",{display:"none"},1.45).from(".hero-title",{scaleY:1.24,transformOrigin:"50% 100%",y:26,duration:1.75,ease:e},.45).from(".hero-line-inner",{yPercent:134,duration:1.65,stagger:.2,ease:e},.55).from(".hero-kicker",{y:56,skewY:6,autoAlpha:0,duration:1.2},.8).from(".hero-sub",{y:62,autoAlpha:0,duration:1.35},.95).from(".hero-cta .btn",{y:46,autoAlpha:0,duration:1.15,stagger:.16},1.1).from(".hero-scroll",{autoAlpha:0,duration:1.05},1.4),ln.utils.toArray(".sec-head").forEach(s=>{const a=s.querySelector(".eyebrow"),o=s.querySelector(".title-mask-inner"),l=ln.timeline({scrollTrigger:{trigger:s,start:"top 85%"}});a&&l.from(a,{yPercent:240,skewY:14,autoAlpha:0,duration:1.55,ease:e}),o&&l.from(o,{yPercent:128,duration:1.55,ease:e},"-=1.1")}),ln.utils.toArray(".about-grid").forEach(s=>{ln.from(s.children,{y:100,autoAlpha:0,duration:1.55,stagger:.22,ease:e,scrollTrigger:{trigger:s,start:"top 78%"}})}),ln.from(".stat",{y:80,autoAlpha:0,duration:1.3,stagger:.14,ease:e,scrollTrigger:{trigger:".stats",start:"top 88%"}}),ln.fromTo(".project-card",{y:120,autoAlpha:0},{y:0,autoAlpha:1,duration:1.75,stagger:.28,ease:e,scrollTrigger:{trigger:".projects-list",start:"top 75%",once:!0}}),ln.utils.toArray(".project-visual").forEach(s=>{const a=s.querySelector("img");a&&(ln.from(a,{clipPath:"inset(0 0 100% 0)",scale:1.14,duration:1.65,ease:t,scrollTrigger:{trigger:s,start:"top 85%"}}),ln.fromTo(a,{scale:1.2,yPercent:-9},{scale:1.2,yPercent:9,ease:"none",scrollTrigger:{trigger:s,start:"top bottom",end:"bottom top",scrub:.9}}))}),ln.timeline({scrollTrigger:{trigger:".contact",start:"top 72%"}}).from(".contact-title .title-mask-inner",{yPercent:128,duration:1.55,stagger:.18,ease:e}).from(".contact-sub",{y:56,autoAlpha:0,duration:1.25},"-=1.05").from(".contact-mail",{y:52,autoAlpha:0,duration:1.2},"-=0.95").from(".contact-socials .social-chip",{y:40,autoAlpha:0,duration:1,stagger:.14,ease:e},"-=0.85"),ln.from(".contact-foot .wrap > *",{y:32,autoAlpha:0,duration:.95,stagger:.1,ease:e,scrollTrigger:{trigger:".contact-foot",start:"top 95%"}})});return()=>n.revert()},[])}function lI(){return oI(),j.jsxs("div",{children:[j.jsx(CA,{}),j.jsxs("main",{children:[j.jsx(XP,{}),j.jsx(kN,{}),j.jsx(BN,{})]}),j.jsx(VN,{})]})}Rp.createRoot(document.getElementById("root")).render(j.jsx(uT.StrictMode,{children:j.jsx(lI,{})}));
