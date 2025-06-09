(function() {
    'use strict';
    
    // 调试模式 - 可以在控制台设置 window.langRedirectDebug = true 开启
    const DEBUG = window.langRedirectDebug || false;
    
    function log(...args) {
        if (DEBUG) {
            console.log('[Lang Redirect]', ...args);
        }
    }
    
    // 只在根路径执行语言检测
    const currentPath = window.location.pathname;
    log('Current path:', currentPath);
    
    if (currentPath !== '/' && currentPath !== '/index.html') {
        log('Not on root path, skipping language detection');
        return;
    }
    
    // 检查是否已经设置了语言偏好
    const langPreference = localStorage.getItem('lang-preference');
    log('Stored language preference:', langPreference);
    
    if (langPreference) {
        log('User has language preference, skipping auto-detection');
        return; // 如果用户已经选择过语言，就不再自动跳转
    }
    
    // 获取浏览器语言
    const browserLang = navigator.language || navigator.languages[0] || 'en';
    log('Browser language:', browserLang);
    log('Available languages:', navigator.languages);
    
    // 语言映射配置
    const langMap = {
        // 中文系列
        'zh': 'zh',
        'zh-CN': 'zh',
        'zh-cn': 'zh',
        'zh-Hans': 'zh',
        'zh-hans': 'zh',
        // 繁体中文
        'zh-TW': 'zh-tw',
        'zh-tw': 'zh-tw',
        'zh-Hant': 'zh-tw',
        'zh-hant': 'zh-tw',
        'zh-HK': 'zh-tw',
        'zh-hk': 'zh-tw',
        'zh-MO': 'zh-tw',
        'zh-mo': 'zh-tw',
        // 英文系列（默认）
        'en': 'en',
        'en-US': 'en',
        'en-us': 'en',
        'en-GB': 'en',
        'en-gb': 'en',
        'en-AU': 'en',
        'en-au': 'en',
        'en-CA': 'en',
        'en-ca': 'en'
    };
    
    // 确定目标语言
    let targetLang = 'en'; // 默认英文
    
    // 完全匹配
    if (langMap[browserLang]) {
        targetLang = langMap[browserLang];
        log('Exact match found:', browserLang, '->', targetLang);
    } else {
        // 部分匹配（只匹配语言代码的前缀）
        const langPrefix = browserLang.split('-')[0].toLowerCase();
        log('Language prefix:', langPrefix);
        
        if (langPrefix === 'zh') {
            // 中文用户，根据地区细分
            const region = browserLang.split('-')[1];
            log('Chinese region:', region);
            if (region && ['TW', 'tw', 'HK', 'hk', 'MO', 'mo', 'Hant', 'hant'].includes(region)) {
                targetLang = 'zh-tw';
                log('Traditional Chinese detected');
            } else {
                targetLang = 'zh';
                log('Simplified Chinese detected');
            }
        } else if (langPrefix === 'en') {
            targetLang = 'en';
            log('English detected');
        } else {
            log('Unknown language, defaulting to English');
        }
    }
    
    log('Target language:', targetLang);
    
    // 如果检测到的语言不是英文，则跳转
    if (targetLang !== 'en') {
        log('Redirecting to', targetLang);
        
        // 设置语言偏好（避免无限循环）
        localStorage.setItem('lang-preference', targetLang);
        
        // 构建新的URL
        const baseUrl = window.location.origin;
        const redirectUrl = `${baseUrl}/${targetLang}/`;
        
        log('Redirect URL:', redirectUrl);
        
        // 使用 replace 而不是 assign，避免在浏览器历史中留下记录
        window.location.replace(redirectUrl);
    } else {
        // 即使是英文，也记录用户偏好
        localStorage.setItem('lang-preference', 'en');
        log('Staying on English site');
    }
    
    // 添加语言切换功能
    window.setLanguagePreference = function(lang) {
        log('Setting language preference to:', lang);
        localStorage.setItem('lang-preference', lang);
    };
    
    // 清除语言偏好的函数（用于调试或重置）
    window.clearLanguagePreference = function() {
        log('Clearing language preference');
        localStorage.removeItem('lang-preference');
    };
    
    // 获取当前语言偏好的函数
    window.getLanguagePreference = function() {
        return localStorage.getItem('lang-preference');
    };
    
    // 强制重新检测语言的函数（用于调试）
    window.forceLanguageDetection = function() {
        log('Forcing language detection');
        localStorage.removeItem('lang-preference');
        location.reload();
    };
    
    // 开启调试模式的函数
    window.enableLangRedirectDebug = function() {
        window.langRedirectDebug = true;
        console.log('Language redirect debug mode enabled');
    };
    
    log('Language redirect script loaded');
    
})(); 