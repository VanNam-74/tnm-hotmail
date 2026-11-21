from random import randint


class GraphApiMicrosoft:
    def __init__(self, client_id: str):
        self.client_id = client_id

    async def get_token_by_code(self, page, token_url, code):
        form_data = {
            "client_id": self.client_id,
            "scope": "https://graph.microsoft.com/User.Read offline_access",
            "code": code,
            "redirect_uri": "https://localhost",
            "grant_type": "authorization_code",
        }
        try:
            response = await page.request.post(
                token_url,
                form=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30000,
            )
            if not response.ok:
                return response.status, await response.text()
            return 200, await response.json()
        except Exception as e:
            return 400, str(e)

    async def get_list_mail_microsoft(self, page, message_url, access_token):
        params = {
            "$top": randint(80, 100),
            "$select": "id,subject,from,receivedDateTime,bodyPreview,body",
            "$orderby": "receivedDateTime desc",
        }
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            response = await page.request.get(
                message_url, params=params, headers=headers, timeout=30000
            )
            if not response.ok:
                return response.status, await response.text()
            return 200, await response.json()
        except Exception as e:
            return 400, str(e)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass
