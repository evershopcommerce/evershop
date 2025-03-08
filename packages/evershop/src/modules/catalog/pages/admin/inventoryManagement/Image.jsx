/* eslint-disable jsx-a11y/label-has-associated-control */
import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@components/common/form/Button';
import './Image.scss';
import { Card } from '@components/admin/cms/Card';
const {
  getContextValue
} = require('../../../../graphql/services/contextHelper');

export default function Image({ product }) {
  const [loading, setLoading] = useState(false);
  const ref = useRef();
  const productType = product.productType;
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const validatePassword = (password) => {
    return password.length >= 6;
  };
  
  const validateKey = (key) => {
    return key.trim().length > 0;
  };
  
  const validateLine = (line, productType) => {
    if (!line.trim()) return { status: "Invalid", details: "Empty line" };
  
    if (productType === "email") {
      const parts = line.split("|");
      if (parts.length !== 2) return { status: "Invalid", details: "Invalid email format" };
      const [email, password] = parts;
      return validateEmail(email) && validatePassword(password)
        ? { status: "Valid", details: { email, password } }
        : { status: "Invalid", details: "Invalid email or password" };
    }
  
    if (productType === "software" || productType === "other") {
      return validateKey(line) ? { status: "Valid", details: { key: line } } : { status: "Invalid", details: "Invalid key" };
    }
  
    if (productType === "account") {
      const parts = line.split("|");
      if (parts.length !== 2 && parts.length !== 3) return { status: "Invalid", details: "Invalid account format" };
      const [username, password, other] = parts;
      return validatePassword(password) && validateKey(username)
        ? { status: "Valid", details: { username, password, other } }
        : { status: "Invalid", details: "Invalid account details" };
    }
  
    return { status: "Invalid", details: "Unknown product type" };
  };
  const [sendData, setSendData] = useState([]);

  const onChange = (e) => {
      e.persist();
      setLoading(true);
      const file = e.target.files[0];
  
      if (!file || file.type !== "text/plain") {
        toast.error("Please upload a valid .txt file");
        setLoading(false);
        return;
      }
  
      const reader = new FileReader();
      reader.onload = (event) => {
        const lines = event.target.result.split("\n");
        const parsedData = [];
        const newSendData = [];
        const invalidEntries = [];
  
        lines.forEach((line) => {
          line = line.trim();
          if (!line) return;
          const { status, details } = validateLine(line, productType);
          parsedData.push({ line, status, details });
          newSendData.push({ ...details });
  
          if (status === "Invalid") {
            invalidEntries.push(`${line} - ${details}`);
          }
        });
  
        setLoading(false);
  
        if (invalidEntries.length > 0) {
          e.target.value = null;
          toast.error(`${invalidEntries.join("\n")}`);
        } else {
          setSendData(newSendData);
          toast.success("File uploaded and parsed successfully");
        }
  
        console.log("parseData: ", parsedData);
        console.log("product type: ", productType);
        console.log("sendData: ", newSendData);
      };
  
      reader.onerror = () => {
        toast.error("Error reading the file");
      };
  
      reader.readAsText(file);
  };

    // const formData = new FormData();
    // for (let i = 0; i < e.target.files.length; i += 1) {
    //   formData.append('images', e.target.files[i]);
    // }
    
    // fetch(
    //   `${imageUploadUrl}/catalog/${
    //     Math.floor(Math.random() * (9999 - 1000)) + 1000
    //   }/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`,
    //   {
    //     method: 'POST',
    //     body: formData,
    //     headers: {
    //       'X-Requested-With': 'XMLHttpRequest'
    //     }
    //   }
    // )
    //   .then((response) => {
    //     if (
    //       !response.headers.get('content-type') ||
    //       !response.headers.get('content-type').includes('application/json')
    //     ) {
    //       throw new TypeError('Something wrong. Please try again');
    //     }

    //     return response.json();
    //   })
    //   .then((response) => {
    //     if (!response.error) {
    //       setImage(response.data.files[0]);
    //     } else {
    //       toast.error(get(response, 'error.message', 'Failed!'));
    //     }
    //   })
    //   .catch((error) => {
    //     toast.error(error.message);
    //   })
    //   .finally(() => {
    //     e.target.value = null;
    //     setLoading(false);
    //   });
  

  return (
    <Card
      title="Upload file(txt)"
    >
      <Card.Session>
        <div className="relative">
          <label
            htmlFor="categoryImageUpload"
            className="flex flex-col justify-center image-uploader"
          >
            <div className="uploader-icon flex justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex justify-center">
              <Button
                title="Add txt file"
                variant="default"
                onAction={() => ref.current.click()}
              />
            </div>
            <div className="flex justify-center mt-4">
              <span style={{ color: '#6d7175', fontSize: '1.2rem' }}>
              <p>Note: Each line in the uploaded file will represent one account. Line structure:</p>
              <ul>
                  <li><strong>Email:</strong> username@gmail.com|password…..</li>
                  <li><strong>Software:</strong> xxx….</li>
                  <li><strong>Account:</strong> username|password and/or anything else</li>
                  <li><strong>Other Type:</strong> xxx….</li>
              </ul>
              </span>
            </div>
          </label>
            {/* Hidden input field to attach sendData */}
          <input type="hidden" name="sendData" value={JSON.stringify(sendData)} />
          <div className="invisible" style={{ width: '1px', height: '1px' }}>
            <input
              id="categoryImageUpload"
              type="file"
              onChange={onChange}
              ref={ref}
            />
          </div>
          {loading === true && (
            <div className="category__image__loading flex justify-center">
              <div className="self-center">
                <svg
                  style={{ display: 'block', shapeRendering: 'auto' }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid"
                >
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="10"
                    r="43"
                    strokeDasharray="202.63272615654165 69.54424205218055"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      repeatCount="indefinite"
                      dur="1s"
                      values="0 50 50;360 50 50"
                      keyTimes="0;1"
                    />
                  </circle>
                </svg>
              </div>
            </div>
          )}
        </div>
      </Card.Session>
    </Card>
  );
}

Image.propTypes = {
  product: PropTypes.shape({
      productType: PropTypes.string
  })
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productType
    }
  }
`;
