const impact=document.getElementById('impact');
window.workFeiBi.onImpact(point=>{impact.classList.remove('hit');impact.style.left=`${point.x}px`;impact.style.top=`${point.y}px`;requestAnimationFrame(()=>impact.classList.add('hit'));});
