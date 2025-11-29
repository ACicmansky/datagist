'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPropertiesAction, savePropertyConfiguration } from '@/app/dashboard/actions';


interface Property {
  name: string;
  id: string;
}

export function OnboardingWizard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [complexity, setComplexity] = useState<'simple' | 'detailed'>('simple');
  const [includeRecommendations, setIncludeRecommendations] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const result = await getPropertiesAction();
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setProperties(result.data);
          if (result.data.length > 0) {
            setSelectedPropertyId(result.data[0].id);
          }
        }
      } catch {
        setError('An unexpected error occurred while fetching properties.');
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return;

    setSaving(true);
    setError(null);

    const selectedProp = properties.find((p) => p.id === selectedPropertyId);
    if (!selectedProp) return;

    try {
      const result = await savePropertyConfiguration(
        {
          property_id: selectedProp.id,
          property_name: selectedProp.name,
          website_url: '', // We don't have this from listGA4Properties yet, maybe add input later
        },
        {
          frequency,
          complexity_level: complexity,
          include_recommendations: includeRecommendations,
        }
      );

      if (result.error) {
        setError(result.error);
      } else {
        // Success - maybe redirect or show success message
        // For now, just refresh
        router.refresh();
      }
    } catch {
      setError('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading properties...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p className="mb-4">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Connect Your Analytics</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Selection */}
        <div>
          <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-1">
            Select GA4 Property
          </label>
          <select
            id="property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" disabled>Select a property...</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name} ({prop.id})
              </option>
            ))}
          </select>
        </div>

        {/* Frequency */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Report Frequency</legend>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="weekly"
                checked={frequency === 'weekly'}
                onChange={(e) => setFrequency(e.target.value as 'weekly')}
                className="mr-2"
              />
              Weekly
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="monthly"
                checked={frequency === 'monthly'}
                onChange={(e) => setFrequency(e.target.value as 'monthly')}
                className="mr-2"
              />
              Monthly
            </label>
          </div>
        </fieldset>

        {/* Complexity */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Report Detail Level</legend>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="simple"
                checked={complexity === 'simple'}
                onChange={(e) => setComplexity(e.target.value as 'simple')}
                className="mr-2"
              />
              Simple (Key Metrics)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="detailed"
                checked={complexity === 'detailed'}
                onChange={(e) => setComplexity(e.target.value as 'detailed')}
                className="mr-2"
              />
              Detailed (Deep Dive)
            </label>
          </div>
        </fieldset>

        {/* Recommendations */}
        <div className="flex items-center">
          <input
            id="recommendations"
            type="checkbox"
            checked={includeRecommendations}
            onChange={(e) => setIncludeRecommendations(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="recommendations" className="ml-2 block text-sm text-gray-900">
            Include AI Recommendations
          </label>
        </div>

        <button
          type="submit"
          disabled={saving || !selectedPropertyId}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
