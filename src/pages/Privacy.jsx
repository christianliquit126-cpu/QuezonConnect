import React from 'react'
import { Link } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'

const LAST_UPDATED = 'April 8, 2026'

export default function Privacy() {
  usePageTitle('Privacy Policy')

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="card p-6 space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">1. Introduction</h2>
          <p>
            QHub (QC Community) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect information about you when you use our platform. By using QHub, you consent to the practices described in this policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">2. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
            <li>Account information: full name, email address, and optional barangay or location</li>
            <li>Profile information: profile photo and display preferences you choose to provide</li>
            <li>Content you create: help requests, community posts, and messages sent through the platform</li>
            <li>Location data: GPS coordinates or manually entered location, used to show nearby resources and help requests. Location is only used when you grant permission.</li>
            <li>Usage data: pages visited, features used, and interactions within the platform for service improvement</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
            <li>Provide and operate the QHub platform and its features</li>
            <li>Connect you with nearby community members and resources</li>
            <li>Send important service notifications and updates</li>
            <li>Moderate content to maintain community safety and standards</li>
            <li>Improve the platform based on usage patterns and feedback</li>
            <li>Comply with legal obligations where applicable</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">4. Data Storage and Security</h2>
          <p>
            Your data is stored securely using Google Firebase, which provides industry-standard encryption and security infrastructure. We implement reasonable technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction.
          </p>
          <p>
            Despite our efforts, no method of transmission over the internet or electronic storage is 100 percent secure. We encourage users to use strong passwords and to keep their login credentials confidential.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">5. Sharing of Information</h2>
          <p>
            We do not sell or rent your personal information to third parties. We may share limited information in the following circumstances:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
            <li>With other users: your name, profile photo, and public posts are visible to other QHub users as part of normal platform operation</li>
            <li>With service providers: we use third-party services such as Firebase (data storage) and Cloudinary (image hosting) that process data on our behalf under strict confidentiality agreements</li>
            <li>For legal compliance: we may disclose information if required by law or in response to valid legal processes</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">6. Location Data</h2>
          <p>
            QHub requests access to your device location to provide location-based features such as finding nearby resources, help requests, and emergency services. Location access is optional and always requires your explicit browser permission. You may revoke location access at any time through your browser settings. Location data is not permanently stored on our servers beyond what is necessary for platform functionality.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
            <li>Access and review the personal information we hold about you</li>
            <li>Request correction of inaccurate or outdated personal information</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent for location access at any time through browser settings</li>
          </ul>
          <p>
            To exercise these rights, please contact us at{' '}
            <a href="mailto:info@qhub.vercel.app" className="text-primary-600 dark:text-primary-400 hover:underline">
              info@qhub.vercel.app
            </a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">8. Cookies and Local Storage</h2>
          <p>
            QHub uses browser local storage to remember your preferences, login session, and cached location data to improve your experience. We do not use advertising cookies or tracking cookies from third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of significant changes by posting a notice on the platform. Continued use of QHub after changes are posted constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">10. Contact</h2>
          <p>
            For questions or concerns about this Privacy Policy, please contact us at{' '}
            <a href="mailto:info@qhub.vercel.app" className="text-primary-600 dark:text-primary-400 hover:underline">
              info@qhub.vercel.app
            </a>{' '}
            or visit our{' '}
            <Link to="/contact" className="text-primary-600 dark:text-primary-400 hover:underline">Contact page</Link>.
          </p>
        </section>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        By using QHub, you acknowledge that you have read and understood this Privacy Policy.{' '}
        <Link to="/terms" className="underline hover:text-gray-600 dark:hover:text-gray-300">View Terms of Service</Link>
      </p>
    </main>
  )
}
