import React, { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'

const CONTACT_DETAILS = [
  {
    icon: Mail,
    label: 'Email Address',
    value: 'info@qhub.vercel.app',
    href: 'mailto:info@qhub.vercel.app',
  },
  {
    icon: Phone,
    label: 'Phone Number',
    value: '(02) 8924-0000',
    href: 'tel:+6289240000',
  },
  {
    icon: MapPin,
    label: 'Office Address',
    value: 'Quezon City Hall Compound, Elliptical Road, Diliman, Quezon City, 1101 Metro Manila',
    href: 'https://maps.google.com/?q=Quezon+City+Hall+Compound+Elliptical+Road+Diliman+Quezon+City',
  },
  {
    icon: Clock,
    label: 'Office Hours',
    value: 'Monday to Friday, 8:00 AM - 5:00 PM (Closed on public holidays)',
    href: null,
  },
]

export default function Contact() {
  usePageTitle('Contact')

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Full name is required.'
    if (!form.email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.'
    }
    if (!form.subject.trim()) errs.subject = 'Subject is required.'
    if (!form.message.trim()) errs.message = 'Message is required.'
    return errs
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      setForm({ name: '', email: '', subject: '', message: '' })
    }, 1200)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Us</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Have a question, suggestion, or concern? Reach out to the QHub team and we will get back to you as soon as possible.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Contact Information</h2>
          <div className="space-y-3">
            {CONTACT_DETAILS.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="card p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline leading-snug mt-0.5 block"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug mt-0.5">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card p-4 space-y-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Emergency Hotlines</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              For urgent matters requiring immediate assistance, please contact:
            </p>
            <div className="space-y-1 pt-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                QC Action Center: <span className="text-primary-600 dark:text-primary-400 font-mono">122</span>
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                QCPD Emergency: <span className="text-primary-600 dark:text-primary-400 font-mono">911</span>
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                DRRMO: <span className="text-primary-600 dark:text-primary-400 font-mono">(02) 8927-5914</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Send a Message</h2>

          {submitted ? (
            <div className="card p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white">Message Sent</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Thank you for reaching out. We have received your message and will respond to you within 1 to 3 business days.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="btn-secondary text-sm mt-2"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="card p-5 space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className={`input-field ${errors.name ? 'border-red-400 dark:border-red-600 focus:ring-red-400' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  className={`input-field ${errors.email ? 'border-red-400 dark:border-red-600 focus:ring-red-400' : ''}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Subject <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="What is your message about?"
                  className={`input-field ${errors.subject ? 'border-red-400 dark:border-red-600 focus:ring-red-400' : ''}`}
                />
                {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Message <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Write your message here..."
                  className={`input-field resize-none ${errors.message ? 'border-red-400 dark:border-red-600 focus:ring-red-400' : ''}`}
                />
                {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Send Message
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Fields marked with <span className="text-red-500">*</span> are required.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
