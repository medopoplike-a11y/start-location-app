package com.start.location;

import android.os.Bundle;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.android.utils.FlipperUtils;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor;
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;
import com.facebook.flipper.plugins.leakcanary2.LeakCanary2FlipperPlugin;
import com.facebook.soloader.SoLoader;
import com.getcapacitor.BridgeActivity;
import leakcanary.LeakCanary;

public class MainActivity extends BridgeActivity {
    private static NetworkFlipperPlugin networkFlipperPlugin;

    public static NetworkFlipperPlugin getNetworkFlipperPlugin() {
        return networkFlipperPlugin;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SoLoader.init(this, false);

        if (FlipperUtils.shouldEnableFlipper(this)) {
            final FlipperClient client = AndroidFlipperClient.getInstance(this);
            networkFlipperPlugin = new NetworkFlipperPlugin();
            client.addPlugin(new InspectorFlipperPlugin(this, DescriptorMapping.withDefaults()));
            client.addPlugin(networkFlipperPlugin);
            client.addPlugin(new LeakCanary2FlipperPlugin());
            client.start();
        }

        LeakCanary.Config config = LeakCanary.getConfig().newBuilder()
                .dumpHeap(true)
                .build();
        LeakCanary.setConfig(config);
    }
}
