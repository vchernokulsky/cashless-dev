using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SLSrvTest
{
    public partial class Form1 : Form
    {
        const string urlConst = @"http://62.152.90.246:60080/slsrv"; // по локальной сети

        // const string urlConst = @"http://sync.sportlifeclub.ru/slsrv";

        public Form1()
        {
            InitializeComponent();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            WebClientEx client = new WebClientEx();
            System.Net.ServicePointManager.ServerCertificateValidationCallback = new System.Net.Security.RemoteCertificateValidationCallback(AcceptAllCertifications);

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";

            //string loginParameters = @"UserName=SLSrv78621&Password=SL123ksd___uuxx_hf_____123123SL";

            //string ss = client.UploadString(urlConst + "/Account/DoLogin", loginParameters);

            // по внутренней сети используется самоподписанный сертификат: 
            /*
            if (ss.ToLower() != "ok")
            {
                MessageBox.Show("Ошибка авторизации: " + ss );
                return;
            }
            else
            {
                // Успех
            }

            Thread.Sleep(100);*/


            string chipId = "00112233445566778899AABBCCDDEEFF";
            string stateParameters = @"chip=" + chipId;

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string s2 = client.UploadString(urlConst + "/Chip/GetState", stateParameters);

            //string logoutParameters = "";
            //client.UploadString(urlConst + "/Account/LogOut", logoutParameters);

            MessageBox.Show(s2);

        }


        private static bool AcceptAllCertifications(object sender, System.Security.Cryptography.X509Certificates.X509Certificate certification, System.Security.Cryptography.X509Certificates.X509Chain chain, System.Net.Security.SslPolicyErrors sslPolicyErrors)
        {
            return true;
        }

        private void button2_Click(object sender, EventArgs e)
        {
            WebClientEx client = new WebClientEx();
            System.Net.ServicePointManager.ServerCertificateValidationCallback = new System.Net.Security.RemoteCertificateValidationCallback(AcceptAllCertifications);

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";

            string loginParameters = @"UserName=SLSrv78621&Password=SL123ksd___uuxx_hf_____123123SL"; 

            string ss = client.UploadString(urlConst + "/Account/DoLogin", loginParameters);

            // по внутренней сети используется самоподписанный сертификат: 

            if (ss.ToLower() != "ok")
            {
                MessageBox.Show("Ошибка авторизации: " + ss);
                return;
            }
            else
            {
                // Успех
            }

            Thread.Sleep(100);


            string writeOffParameters = @"dev=1&chip=00112233445566778899AABBCCDDEEFF&srvid=8633&price=150"; // услуга 8633, цена 1 руб. 50 коп.

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string s2 = client.UploadString(urlConst + "/Chip/WriteOffV2", writeOffParameters);

            string logoutParameters = "";
            client.UploadString(urlConst + "/Account/LogOut", logoutParameters);

            MessageBox.Show(s2);
        }

        private void button3_Click(object sender, EventArgs e)
        {
            WebClientEx client = new WebClientEx();
            System.Net.ServicePointManager.ServerCertificateValidationCallback = new System.Net.Security.RemoteCertificateValidationCallback(AcceptAllCertifications);

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";

            string loginParameters = @"UserName=SLSrv78621&Password=SL123ksd___uuxx_hf_____123123SL";

            string ss = client.UploadString(urlConst + "/Account/DoLogin", loginParameters);

            // по внутренней сети используется самоподписанный сертификат: 

            if (ss.ToLower() != "ok")
            {
                MessageBox.Show("Ошибка авторизации: " + ss);
                return;
            }
            else
            {
                // Успех
            }

            Thread.Sleep(100);


            string writeOffParameters = @"dev=1000&chip=00112233445566778899AABBCCDDEEFF&minutes=15"; // услуга 8633, цена 1 руб. 50 коп.

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string s2 = client.UploadString(urlConst + "/Chip/WriteOffSolV2", writeOffParameters);

            string logoutParameters = "";
            client.UploadString(urlConst + "/Account/LogOut", logoutParameters);

            MessageBox.Show(s2);
        }

        private void button5_Click(object sender, EventArgs e)
        {
            WebClientEx client = new WebClientEx();
            System.Net.ServicePointManager.ServerCertificateValidationCallback = new System.Net.Security.RemoteCertificateValidationCallback(AcceptAllCertifications);

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";

            string loginParameters = @"UserName=SLSrv78621&Password=SL123ksd___uuxx_hf_____123123SL";

            string ss = client.UploadString(urlConst + "/Account/DoLogin", loginParameters);

            // по внутренней сети используется самоподписанный сертификат: 

            if (ss.ToLower() != "ok")
            {
                MessageBox.Show("Ошибка авторизации: " + ss);
                return;
            }
            else
            {
                // Успех
            }

            Thread.Sleep(100);


            string writeOffParameters = @"dev=1000&chip=00112233445566778899AABBCCDDEEFF&writeoffid=1&success=1"; // услуга 8633, цена 1 руб. 50 коп.

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string s2 = client.UploadString(urlConst + "/Chip/WriteOffCommit", writeOffParameters);

            string logoutParameters = "";
            client.UploadString(urlConst + "/Account/LogOut", logoutParameters);

            MessageBox.Show(s2);
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
