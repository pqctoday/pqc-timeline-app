import { useState } from 'react';
import { motion } from 'framer-motion';
import { timelineData, type CountryData } from '../../data/timelineData';
import { CountrySelector } from './CountrySelector';
import { ExternalLink, Calendar } from 'lucide-react';

export const TimelineView = () => {
    const [selectedCountry, setSelectedCountry] = useState<CountryData>(timelineData[0]);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 text-gradient">Global Migration Timeline</h2>
                <p className="text-muted max-w-2xl mx-auto">
                    Explore the regulatory roadmap for Post-Quantum Cryptography across different nations.
                    Track key milestones from discovery to full migration.
                </p>
            </div>

            <div className="flex justify-center">
                <CountrySelector
                    countries={timelineData}
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                />
            </div>

            <div className="relative mt-12">
                {/* Vertical Line */}
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/0 via-primary/50 to-primary/0" aria-hidden="true" />

                <div className="space-y-12">
                    {selectedCountry.bodies[0].events.map((event, index) => (
                        <motion.article
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                                }`}
                        >
                            {/* Timeline Dot */}
                            <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-bg border-2 border-primary transform -translate-x-1/2 z-10 shadow-[0_0_10px_var(--color-primary)]" aria-hidden="true" />

                            {/* Content Card */}
                            <div className={`ml-12 md:ml-0 w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'
                                }`}>
                                <div className="glass-panel p-6 hover:border-primary/30 transition-colors group">
                                    <div className={`flex items-center gap-2 text-primary mb-2 ${index % 2 === 0 ? 'md:justify-end' : 'md:justify-start'
                                        }`}>
                                        <Calendar size={14} aria-hidden="true" />
                                        <span className="font-mono font-bold">{event.year}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                            {event.phase}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                        {event.title}
                                    </h3>

                                    <p className="text-muted text-sm mb-4 leading-relaxed">
                                        {event.description}
                                    </p>

                                    <a
                                        href={event.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Source for ${event.title} (opens in new window)`}
                                        className={`inline-flex items-center gap-1 text-xs text-muted hover:text-white transition-colors ${index % 2 === 0 ? 'md:ml-auto' : 'md:mr-auto'
                                            }`}
                                    >
                                        Source <ExternalLink size={10} aria-hidden="true" />
                                    </a>
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </div>
    );
};
