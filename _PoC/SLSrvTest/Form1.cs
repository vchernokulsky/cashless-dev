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
        private Button button1;
        private Button button2;
        // const string urlConst = @"https://172.16.0.68/slsrv"; // по локальной сети

        //const string urlConst = @"https://sync.sportlifeclub.ru/slsrv";
        const string urlConst = @"http://sync.sportlifeclub.ru:60080/slsrv";

        public Form1()
        {
            InitializeComponent();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            WebClientEx client = new WebClientEx();
            System.Net.ServicePointManager.ServerCertificateValidationCallback = new System.Net.Security.RemoteCertificateValidationCallback(AcceptAllCertifications);
            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string loginParameters = @"UserName=SLSrv78621&Password=SL123ksd___uuxx_hf_____123123SL";

//            string ss = client.UploadString(urlConst + "/account/login", loginParameters);
//            // по внутренней сети используется самоподписанный сертификат: 
//            if (ss.ToLower() != "ok")
//            {
//                MessageBox.Show("Ошибка авторизации: " + ss );
//                return;
//            }
//            else
//            {
//                // Успех
//            }

            Thread.Sleep(100);
            string chipId = "011000000168435012";
            string stateParameters = @"chip=" + chipId;

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string s2 = client.UploadString(urlConst + "/Chip/GetState", stateParameters);

//            string logoutParameters = "";
//            client.UploadString(urlConst + "/Account/LogOut", logoutParameters);

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
            

            string writeOffParameters = @"chip=011000000168435012&srvid=8633&price=150" ; // услуга 8633, цена 1 руб. 50 коп.

            client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
            string s2 = client.UploadString(urlConst + "/Chip/WriteOff", writeOffParameters);

            string logoutParameters = "";
            client.UploadString(urlConst + "/Account/LogOut", logoutParameters);

            MessageBox.Show(s2);
        }

        private void InitializeComponent()
        {
            this.button1 = new System.Windows.Forms.Button();
            this.button2 = new System.Windows.Forms.Button();
            this.SuspendLayout();
            // 
            // button1
            // 
            this.button1.Location = new System.Drawing.Point(13, 13);
            this.button1.Name = "button1";
            this.button1.Size = new System.Drawing.Size(75, 23);
            this.button1.TabIndex = 0;
            this.button1.Text = "button1";
            this.button1.UseVisualStyleBackColor = true;
            this.button1.Click += new System.EventHandler(this.button1_Click);
            // 
            // button2
            // 
            this.button2.Location = new System.Drawing.Point(13, 43);
            this.button2.Name = "button2";
            this.button2.Size = new System.Drawing.Size(75, 23);
            this.button2.TabIndex = 1;
            this.button2.Text = "button2";
            this.button2.UseVisualStyleBackColor = true;
            this.button2.Click += new System.EventHandler(this.button2_Click);
            // 
            // Form1
            // 
            this.ClientSize = new System.Drawing.Size(284, 262);
            this.Controls.Add(this.button2);
            this.Controls.Add(this.button1);
            this.Name = "Form1";
            this.ResumeLayout(false);

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
