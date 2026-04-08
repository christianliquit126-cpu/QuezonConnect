import React from 'react'
import { Link } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'

const LAST_UPDATED = 'April 8, 2026'

export default function Terms() {
  usePageTitle('Terms of Service')

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="card p-6 space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using QHub (QC Community), operated for the benefit of Quezon City residents, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">2. Description of Service</h2>
          <p>
            QHub is a community help and support platform designed for residents of Quezon City, Metro Manila, Philippines. The platform allows users to request assistance, offer help, view community resources, access local emergency information, and communicate with other community members.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">3. User Accounts</h2>
          <p>
            To access certain features of QHub, you must create an account. You agree to provide accurate and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account.
          </p>
          <p>
            You must be at least 13 years of age to create an account. Users under 18 are advised to obtain parental consent before registering.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">4. Acceptable Use</h2>
          <p>When using QHub, you agree not to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
            <li>Post false, misleading, or fraudulent help requests or offers</li>
            <li>Harass, threaten, or intimidate other users</li>
            <li>Share personal information of others without their consent</li>
            <li>Use the platform for commercial solicitation or spam</li>
            <li>Impersonate any person, organization, or government entity</li>
            <li>Upload or share harmful, obscene, or illegal content</li>
            <li>Attempt to access other users accounts or system data without authorization</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">5. Community Standards</h2>
          <p>
            QHub is built on trust and mutual respect among Quezon City community members. All users are expected to behave with honesty, courtesy, and good faith. Posts and requests are subject to moderation. Content that violates these standards may be removed and accounts may be suspended or terminated.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">6. Disclaimer of Liability</h2>
          <p>
            QHub facilitates connections between community members but does not guarantee the accuracy, safety, or reliability of any help requests, offers, or interactions. QHub is not responsible for any harm, loss, or disputes arising from interactions between users. Users engage with each other at their own risk and are encouraged to exercise personal judgment and caution.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">7. Intellectual Property</h2>
          <p>
            All content, design, and code on QHub is the property of the QHub development team unless otherwise indicated. You may not reproduce, distribute, or use our content without express written permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">8. Modifications to Terms</h2>
          <p>
            We reserve the right to update or modify these Terms of Service at any time. Continued use of the platform after changes are posted constitutes your acceptance of the revised terms. We will make reasonable efforts to notify users of significant changes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">9. Contact</h2>
          <p>
            For questions or concerns regarding these Terms of Service, please contact us at{' '}
            <a href="mailto:info@qhub.vercel.app" className="text-primary-600 dark:text-primary-400 hover:underline">
              info@qhub.vercel.app
            </a>{' '}
            or visit our{' '}
            <Link to="/contact" className="text-primary-600 dark:text-primary-400 hover:underline">Contact page</Link>.
          </p>
        </section>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        By using QHub, you acknowledge that you have read and understood these Terms of Service.{' '}
        <Link to="/privacy" className="underline hover:text-gray-600 dark:hover:text-gray-300">View Privacy Policy</Link>
      </p>
    </main>
  )
}
