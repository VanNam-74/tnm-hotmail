import random
import string
import json
from app.services.gettoken.bypass import bypass

class AntiBot:
    def secure_random_string(self,length=64):
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

    def generate_fingerprint(self, data_profile):
        fp = data_profile
        return {
            "webgl": {
                "GPU": fp.gpu,
                "Random": fp.random,
                "R6408": fp.r6408,
                "R35661": fp.r35661,
                "R36349": fp.r36342,
            },
            "device1": fp.device1,
            "device2": fp.device2,
            "navigator": {
                "vendorSub": "",
                "productSub": "20030107",
                "vendor": "Google Inc.",
                "maxTouchPoints": 0,
                "userActivation": {
                    "hasBeenActive": False,
                    "isActive": False,
                },
                "connection": {
                    "effectiveType": "4g",
                    "rtt": 100,
                    "downlink": 10.0,
                    "saveData": False,
                    "type": "wifi"
                },
                "hardwareConcurrency": 8,
                "cookieEnabled": True,
                "appCodeName": "Mozilla",
                "appName": "Netscape",
                "appVersion": "5.0 (Windows)",
                "platform": "Win32",
                "product": "Gecko",
                "userAgent": fp.user_agent if fp.user_agent else "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "language": "en-US",
                "onLine": True,
                "mediaSession": {
                    "playbackState": "none"
                },
                "deviceMemory": fp.device_memory if fp.device_memory else 4,
            }
        } 
    
    def build_js_injection(self, fp_json: dict):
        bypass_js = bypass()
        return f"const DanaFP = {json.dumps(fp_json)};\n{bypass_js}"
    
    def get_browser_argument(self):
        return [
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            '--unsafely-treat-insecure-origin-as-secure=https://localhost',
            "--disable-blink-features=AutomationControlled",  
            "--exclude-switches=enable-automation",           
            "--disable-automation",                                         
            "--disable-infobars",                                    
            "--disable-default-apps",                                        
            "--no-first-run",                                         
            "--no-default-browser-check",                                 
            "--disable-backgrounding-occluded-windows",            
            "--disable-renderer-backgrounding",                      
            "--disable-background-timer-throttling",               
            "--disable-features=TranslateUI",                            
            "--disable-ipc-flooding-protection",                      
            "--disable-hang-monitor",                               
            "--disable-client-side-phishing-detection",                 
            "--disable-popup-blocking",                               
            "--disable-prompt-on-repost",                         
            "--disable-sync",                                    
            "--disable-domain-reliability",                             
            "--disable-component-update",                              
            "--disable-background-networking",                          
            "--metrics-recording-only",                      
            "--no-report-upload",                                  
            "--no-pings",                                    
            "--password-store=basic",                               
            "--use-mock-keychain",                                
            "--mute-audio",                                    
            "--remote-debugging-port=0",                                 
            "--disable-logging",                                     
            "--disable-gpu-sandbox",                             
            "--disable-software-rasterizer",                            
            "--disable-background-timer-throttling",                 
            "--disable-features=VizDisplayCompositor,VizHitTestDrawQuad,TranslateUI",
            "--aggressive-cache-discard",                  
            "--disable-extensions-http-throttling",                       
            "--disable-component-extensions-with-background-pages",
            "--force-color-profile=srgb",                          
            "--hide-scrollbars",  
        ]