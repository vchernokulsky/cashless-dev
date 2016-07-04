using System;
using System.Net;
using System.Threading;

namespace CashlessMockup
{
    internal class SportLifeClient
    {
        private const string UrlConst = @"http://sync.sportlifeclub.ru:60080/slsrv";

        public string GetUserBalance()
        {
            WebClientEx client = new WebClientEx();
            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            Thread.Sleep(100);

            string chipId = "011000000168435012";
            string stateParameters = @"chip=" + chipId;

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string s2 = client.UploadString(UrlConst + "/Chip/GetState", stateParameters);

            return s2;
        }
    }

    internal class WebClientEx : WebClient
    {
        private CookieContainer _cookieContainer = new CookieContainer();

        protected override WebRequest GetWebRequest(Uri address)
        {
            WebRequest request = base.GetWebRequest(address);
            if (request is HttpWebRequest)
                (request as HttpWebRequest).CookieContainer = _cookieContainer;

            return request;
        }
    }
}
