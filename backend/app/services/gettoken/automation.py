

import asyncio
import random
import time

import pyotp

from app.services.gettoken.schemas import AccountWithCredentials
from app.services.gettoken.schemas import TokenResult

async def auto_get_code_microsoft(acc, page, auto_get_token_progress_queue):

    try:
        current_url = ""
        completed = False
        start_time = time.time()
        timeout = 90
        max_number_of_time_fill = 3
        count_number_of_time_fill = 0
        auth_code = None
        google_2fa_code = None
        recovery_code = None
        error_automation_msg = None
        
        def on_request(request):
            nonlocal current_url
            current_url = request.url

        page.on("request", on_request)

        id = acc.id
        username = acc.email
        password = acc.password
        gg_2fa = acc.two_fa
        recovery_email = acc.recovery


        while not completed:
            if time.time() - start_time > timeout:
                error_automation_msg = "Get token timeout"
                completed = True
                return None

                
            time_type_delay = random.randrange(150,250, 5)
            time_delay = random.randint(1,3)

            email_input = page.locator('//input[@name="loginfmt"]')
            if await email_input.is_visible():
                
                await email_input.click()
                await page.keyboard.press("Control+A")

                await asyncio.sleep(time_delay)
                await email_input.type(username, delay=time_type_delay)
                await page.locator('//input[@type="submit"]').click() 
                await asyncio.sleep(time_delay)

            email_input_err = page.locator('//div[@id="usernameError"]')
            if await email_input_err.is_visible():
                
                error_automation_msg = "Username is incorrect"
                completed = True

            password_input = page.locator('//input[@name="passwd" and @id="passwordEntry"]')
            if await password_input.is_visible():

                await asyncio.sleep(time_delay)
                await password_input.click()
                await page.keyboard.press("Control+A")
                await password_input.type(password, delay=time_type_delay)
                await page.locator('//button[@type="submit"]').click()
                await asyncio.sleep(time_delay)

            
            gg_2fa_input = page.locator('//input[@type="text"]')
            if await gg_2fa_input.is_visible():
                
                str_code = gg_2fa
                otp = exchange_2fa_code(str_code) if str_code else None
                await asyncio.sleep(time_delay)
                await gg_2fa_input.click()
                await page.keyboard.press("Control+A")
                await gg_2fa_input.type(otp, delay=time_type_delay)
                await page.locator('//button[@type="submit"]').click()
                await asyncio.sleep(time_delay)
                count_number_of_time_fill += 1

            gg_2fa_input_2 = page.locator('//input[@id="otc-confirmation-input"]')
            if await gg_2fa_input_2.is_visible():
                str_code = gg_2fa
                otp = exchange_2fa_code(str_code) if str_code else None
                await asyncio.sleep(time_delay)
                await gg_2fa_input_2.click()
                await page.keyboard.press("Control+A")
                await gg_2fa_input_2.type(otp, delay=time_type_delay)
                await page.locator('//button[@type="submit"]').click()
                await asyncio.sleep(time_delay)
                count_number_of_time_fill += 1

            if count_number_of_time_fill == max_number_of_time_fill:
                error_automation_msg = "2FA code is incorrect"
                completed = True

            validation_pass = page.locator('//div[contains(@id,"validationMessage")]')
            has_child_validtion_pass = await validation_pass.locator(":scope > *").count() > 0
            if has_child_validtion_pass:
            
                error_automation_msg = "Password is incorrect"
                completed = True

                


            title_recovery_email = page.locator('//h1[@data-testid="title" and text()="Xác minh email của bạn" or text()="Verify your email"]')
            
            if await title_recovery_email.is_visible():

                recovery_domain = await page.locator("//span[contains(text(), '@dallebz.com')]").text_content()
                recovery_domain = recovery_domain.split('@')[1]
                local_part = username.split('@')[0]
                recovery_email = local_part + "@" + recovery_domain
                input = page.locator('//input[@type="text"]')
                await input.click()
                await page.keyboard.press("Control+A")
                await input.type(recovery_email, delay=time_type_delay)
                await input.press("Enter")



            code_wrapper_recovery = page.locator('//div[@data-testid="codeInputWrapper"]')
            if await code_wrapper_recovery.count() == 6:
                code_input_recovery = code_wrapper_recovery.locator('//input[@type="text"]')
                await asyncio.sleep(time_delay)
                for i, digit in enumerate(recovery_code):
                    await code_input_recovery.nth(i).click()
                    await code_input_recovery.nth(i).press(digit)
                


                



            stay_signed_in_prompt = page.locator('//h1[text() = "Stay signed in?"]')
            if await stay_signed_in_prompt.is_visible():
                yes_button = page.locator('//button[@type="submit" and @data-testid="primaryButton"]')
                await asyncio.sleep(time_delay)
                await yes_button.click()
            
            


            if "https://login.live.com/ppsecure/post.srf" in page.url:
                error_ele = page.locator('//body[text()="Please retry with a different device or other authentication method to sign in. For more details, please see "]')
                if await error_ele.is_visible():
                    error_automation_msg = "Please retry with a different device"
                    completed = True
                    return None

            if "https://account.live.com/Consent/Update" in page.url:
                
                await asyncio.sleep(time_delay)
                await page.locator('(//button[@type="submit"])[2]').click() #accept thunder bird
                await asyncio.sleep(time_delay)
                
            if "https://account.live.com/interrupt/passkey" in page.url:
            
                await page.locator('button[@type="button" and @data-testid="secondaryButton"]').click() #no thanks passkey
                await asyncio.sleep(time_delay)

            if "https://account.live.com/App/Confirm" in page.url:
            
                await asyncio.sleep(time_delay)
                await page.locator('//input[@type="submit" and @name="appConfirmContinue"]').click() #yes
                await asyncio.sleep(time_delay)

            if "https://outlook.live.com/mail/" in page.url:
                error_automation_msg = "Account is already logged in"
                completed = True
                return None

            if "https://localhost/?code=" in current_url:
                
                completed = True
                auth_code = current_url.split("=")[1]
            
            
        if error_automation_msg is not None:
            await auto_get_token_progress_queue.put(
                TokenResult(
                    account_id=id,
                    email=username,
                    error=error_automation_msg,
                )
            )

        if not completed and auth_code is None:
            await auto_get_token_progress_queue.put(
                TokenResult(
                    account_id=id,
                    email=username,
                    error="Get token failed",
                )
            )


        if completed and auth_code is not None:
            await auto_get_token_progress_queue.put(
                TokenResult(
                    account_id=id,
                    email=username,
                    success="Authorization code obtained",
                )
            )
            
        return auth_code
    except Exception as e:
        print("Automation error: ", e)
        traceback.print_exc()
        return None 


def exchange_2fa_code(str_code):
    try:
        totp = pyotp.TOTP(str_code.replace(" ",""))
        code = totp.now()

        return str(code).strip()
    except Exception as e:
        print(e)