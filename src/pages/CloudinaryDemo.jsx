import React from 'react'
import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';

const CloudinaryDemo = () => {
  const cld = new Cloudinary({ cloud: { cloudName: 'dhtotljvn' } });
  
  // Use this sample image or upload your own via the Media Library
  const img = cld
        .image('cld-sample-5')
        .format('auto') // Optimize delivery by resizing and applying auto-format and auto-quality
        .quality('auto')
        .resize(auto().gravity(autoGravity()).width(500).height(500)); // Transform the image: auto-crop to square aspect_ratio

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <h2 style={{ marginBottom: 20 }}>Cloudinary Integration Demo</h2>
      <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
        <AdvancedImage cldImg={img}/>
      </div>
      <p style={{ marginTop: 20, color: 'var(--text-muted)' }}>Image served and transformed by Cloudinary</p>
    </div>
  );
};

export default CloudinaryDemo;
