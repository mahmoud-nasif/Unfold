/*! unfold engine 0.4.1 | MIT License */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg';
var VERSION='0.4.1';
var SNAP=10;
var FONT_LINKS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">';
var reduceMotion=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

